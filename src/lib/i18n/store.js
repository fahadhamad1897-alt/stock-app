import { writable, derived } from 'svelte/store';
import en from './en.json';
import ar from './ar.json';

/** @type {Record<string, Record<string, string>>} */
const translations = { en, ar };

export const locale = writable('ar');

export const t = derived(locale, ($locale) => {
    /** @param {string} key */
    return (key) => {
        return translations[$locale]?.[key] || key;
    };
});