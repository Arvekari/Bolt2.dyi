declare module 'sql.js' {
  const initSqlJs: (config?: unknown) => Promise<any>;
  export default initSqlJs;
}

declare module 'node:fs/promises' {
  const fsPromises: any;
  export default fsPromises;
}

declare module 'node:path' {
  const path: any;
  export default path;
}
