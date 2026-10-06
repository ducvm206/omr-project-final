package com.example.omr_phone.data.api

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl

/**
 * In-memory cookie store. Persists cookies for the life of the process
 * so the JSESSIONID set by /api/login is sent on subsequent requests.
 *
 * Not persistent across process death — for that, use a disk-backed
 * CookieJar (e.g. PersistentCookieJar or your own store).
 */
class InMemoryCookieJar : CookieJar {
    private val store = mutableMapOf<String, MutableList<Cookie>>()

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val key = url.host
        val list = store.getOrPut(key) { mutableListOf() }
        cookies.forEach { newCookie ->
            // Replace an existing cookie with the same name.
            list.removeAll { it.name == newCookie.name }
            list.add(newCookie)
        }
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val list = store[url.host].orEmpty()
        val now = System.currentTimeMillis()
        return list.filter { it.expiresAt > now }
    }
}