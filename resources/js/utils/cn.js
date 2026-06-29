/** Tiny className merger — joins truthy strings */
export const cn = (...classes) => classes.filter(Boolean).join(' ');
