// src/api/endpoints/Template.ts

import type { SearchForm } from '../../types/Common';
import type { TemplateConfig, TemplateDS } from '../../types/Template';
import { apiFetch, apiFetchBlob } from '../client';

/**
 * Search templates owned by the current user.
 * POST /api/templates
 *
 *   { searchParams: { name?: string } }
 */
export async function searchTemplates(form: SearchForm): Promise<TemplateDS[]> {
    const templates = await apiFetch<TemplateDS[] | null>('/api/templates', {
        method: 'POST',
        body: form,
    });
    return templates ?? [];
}

/**
 * Create a new template.
 * POST /api/templates/create
 *
 * The backend calls the OMR engine to generate the template PDF.
 */
export async function createTemplate(req: TemplateConfig): Promise<TemplateDS> {
    return apiFetch<TemplateDS>('/api/templates/create', {
        method: 'POST',
        body: req,
        // OMR engine can be slow.
        timeoutMs: 120_000,
    });
}

/**
 * Delete a template.
 * POST /api/templates/{id}/delete
 */
export async function deleteTemplate(id: number): Promise<void> {
    await apiFetch<void>(`/api/templates/${id}/delete`, { method: 'POST' });
}

/**
 * Fetch the template PDF as a Blob.
 * GET /api/templates/{id}/view
 *
 *   const blob = await getTemplatePdf(id);
 *   const url = URL.createObjectURL(blob);
 *   // ... render <embed src={url} type="application/pdf" />
 *   // URL.revokeObjectURL(url) when done
 */
export async function getTemplatePdf(id: number): Promise<Blob> {
    return apiFetchBlob(`/api/templates/${id}/view`);
}