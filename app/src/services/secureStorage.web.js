/* eslint-env browser */
// A prévia web mantém as sessões somente na aba atual.
export const readValue = async key => sessionStorage.getItem(key);
export const writeValue = async (key, value) => sessionStorage.setItem(key, value);
export const removeValue = async key => sessionStorage.removeItem(key);
