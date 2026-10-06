# core/utils/db_connector.py
"""General-purpose PostgreSQL database connector - Reads configuration from .env file."""

import os
import json
from typing import Optional, Dict, Any, List, Tuple, Union
from contextlib import contextmanager
from dataclasses import dataclass

from dotenv import load_dotenv

import psycopg2
from psycopg2 import sql, extras
from psycopg2.extensions import connection as Psycopg2Connection
from psycopg2.extras import RealDictCursor


# =============================================================================
# ENVIRONMENT LOADING
# =============================================================================

def load_env_file():
    """Load .env file from project root."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    
    env_paths = [
        os.path.join(project_root, '.env'),
        os.path.join(current_dir, '.env'),
        os.path.join(os.getcwd(), '.env')
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            return
    
    load_dotenv()


load_env_file()


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class DBConfig:
    """Database configuration from environment variables."""
    host: str = None
    port: int = None
    database: str = None
    user: str = None
    password: str = None
    sslmode: str = None
    pool_min_size: int = 1
    pool_max_size: int = 10
    
    @classmethod
    def from_env(cls):
        """Create DBConfig from environment variables."""
        return cls(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            database=os.getenv("DB_DATABASE", "omr_db"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "postgres"),
            sslmode=os.getenv("DB_SSLMODE", "disable"),
            pool_min_size=int(os.getenv("DB_POOL_MIN", "1")),
            pool_max_size=int(os.getenv("DB_POOL_MAX", "10"))
        )
    
    def get_connection_string(self) -> str:
        """Build connection string from config."""
        return (
            f"host={self.host} port={self.port} "
            f"dbname={self.database} user={self.user} "
            f"password={self.password} sslmode={self.sslmode}"
        )


# =============================================================================
# DATABASE CONNECTOR
# =============================================================================

class DBConnector:
    """
    General-purpose PostgreSQL database connector.
    Handles connection pooling and provides utility methods.
    """
    
    def __init__(self, config: Optional[DBConfig] = None):
        """
        Initialize database connector.
        
        Args:
            config: DBConfig object (optional, reads from .env if not provided)
        """
        self.config = config if config is not None else DBConfig.from_env()
        self._connection: Optional[Psycopg2Connection] = None
        self._is_closed = False
    
    def _get_connection(self) -> Psycopg2Connection:
        """Get or create database connection."""
        if self._connection is None or self._connection.closed:
            self._connection = psycopg2.connect(self.config.get_connection_string())
            self._connection.autocommit = False
        return self._connection
    
    def _reset_connection(self):
        """Reset connection if it's broken."""
        try:
            if self._connection and not self._connection.closed:
                self._connection.close()
        except Exception:
            pass
        self._connection = None
    
    @contextmanager
    def get_cursor(self, cursor_factory=None):
        """
        Get a database cursor as a context manager.
        
        Args:
            cursor_factory: Cursor factory (e.g., RealDictCursor)
            
        Yields:
            Database cursor
        """
        if self._is_closed:
            raise RuntimeError("Connector is closed")
        
        conn = self._get_connection()
        cursor = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            self._reset_connection()
            raise e
        finally:
            cursor.close()
    
    def execute(self, query: str, params: tuple = None, fetch: bool = False) -> Any:
        """
        Execute a query and optionally fetch results.
        
        Args:
            query: SQL query string
            params: Query parameters (tuple)
            fetch: Whether to fetch results
            
        Returns:
            Fetched results if fetch=True, else None
        """
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            if fetch:
                return cursor.fetchall()
            return None
    
    def execute_one(self, query: str, params: tuple = None) -> Any:
        """
        Execute a query and fetch one result.
        
        Args:
            query: SQL query string
            params: Query parameters (tuple)
            
        Returns:
            Single row result
        """
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchone()
    
    def execute_dict(self, query: str, params: tuple = None) -> List[Dict]:
        """
        Execute a query and fetch results as dictionaries.
        
        Args:
            query: SQL query string
            params: Query parameters (tuple)
            
        Returns:
            List of dictionaries
        """
        with self.get_cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def execute_dict_one(self, query: str, params: tuple = None) -> Optional[Dict]:
        """
        Execute a query and fetch one result as a dictionary.
        
        Args:
            query: SQL query string
            params: Query parameters (tuple)
            
        Returns:
            Single row as dictionary
        """
        with self.get_cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, params)
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def insert(self, table: str, data: Dict[str, Any], returning: str = "id") -> Any:
        """
        Insert a row into a table.
        
        Args:
            table: Table name
            data: Dictionary of column:value
            returning: Column to return
            
        Returns:
            Value of the returning column
        """
        columns = list(data.keys())
        placeholders = ", ".join(["%s"] * len(columns))
        columns_str = ", ".join(columns)
        
        query = f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders}) RETURNING {returning}"
        
        with self.get_cursor() as cursor:
            cursor.execute(query, list(data.values()))
            result = cursor.fetchone()
            return result[0] if result else None
    
    def update(self, table: str, data: Dict[str, Any], where: Dict[str, Any]) -> int:
        """
        Update rows in a table.
        
        Args:
            table: Table name
            data: Dictionary of column:value to update
            where: Dictionary of column:value for WHERE clause
            
        Returns:
            Number of rows affected
        """
        set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
        where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
        
        query = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        params = list(data.values()) + list(where.values())
        
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.rowcount
    
    def delete(self, table: str, where: Dict[str, Any]) -> int:
        """
        Delete rows from a table.
        
        Args:
            table: Table name
            where: Dictionary of column:value for WHERE clause
            
        Returns:
            Number of rows affected
        """
        where_clause = " AND ".join([f"{k} = %s" for k in where.keys()])
        query = f"DELETE FROM {table} WHERE {where_clause}"
        
        with self.get_cursor() as cursor:
            cursor.execute(query, list(where.values()))
            return cursor.rowcount
    
    def close(self):
        """Close database connection."""
        if self._connection and not self._connection.closed:
            self._connection.close()
            self._connection = None
        self._is_closed = True
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# =============================================================================
# SINGLETON
# =============================================================================

_db_connector: Optional[DBConnector] = None


def get_db_connector(config: Optional[DBConfig] = None) -> DBConnector:
    """
    Get or create the database connector singleton.
    
    Args:
        config: DBConfig object (optional, reads from .env if not provided)
        
    Returns:
        DBConnector instance
    """
    global _db_connector
    if _db_connector is None:
        _db_connector = DBConnector(config)
    return _db_connector


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def execute_query(query: str, params: tuple = None, fetch: bool = False) -> Any:
    """Execute a query using the singleton connector."""
    return get_db_connector().execute(query, params, fetch)


def execute_dict(query: str, params: tuple = None) -> List[Dict]:
    """Execute a query and return results as dictionaries."""
    return get_db_connector().execute_dict(query, params)


def execute_dict_one(query: str, params: tuple = None) -> Optional[Dict]:
    """Execute a query and return one result as a dictionary."""
    return get_db_connector().execute_dict_one(query, params)


def insert_row(table: str, data: Dict[str, Any], returning: str = "id") -> Any:
    """Insert a row using the singleton connector."""
    return get_db_connector().insert(table, data, returning)


def update_rows(table: str, data: Dict[str, Any], where: Dict[str, Any]) -> int:
    """Update rows using the singleton connector."""
    return get_db_connector().update(table, data, where)


def delete_rows(table: str, where: Dict[str, Any]) -> int:
    """Delete rows using the singleton connector."""
    return get_db_connector().delete(table, where)


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("Database Connector Test")
    print("=" * 60)
    
    # Show config from .env
    config = DBConfig.from_env()
    print(f"DB_HOST: {config.host}")
    print(f"DB_PORT: {config.port}")
    print(f"DB_DATABASE: {config.database}")
    print(f"DB_USER: {config.user}")
    print(f"DB_PASSWORD: {'*' * len(config.password)}")
    print()
    
    # Test connection
    db = get_db_connector()
    
    try:
        # Test query
        result = db.execute_one("SELECT 1 as test")
        print("✅ Database connection successful!")
        print(f"   Test query result: {result}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
    
    # Example: Get template
    print("\n" + "-" * 40)
    template_id = "1"
    print(f"Loading template ID: {template_id}")
    
    try:
        result = db.execute_dict_one(
            "SELECT id, name, mcq_questions, written_questions, template_json FROM templates WHERE id = %s",
            (template_id,)
        )
        
        if result:
            print(f"✅ Template found")
            print(f"   Name: {result.get('name')}")
            print(f"   MCQ: {result.get('mcq_questions')}")
            print(f"   Written: {result.get('written_questions')}")
        else:
            print(f"❌ Template not found")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    db.close()