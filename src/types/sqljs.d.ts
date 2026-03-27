declare module "sql.js" {
  export type Database = {
    exec(sql: string): unknown;
    export(): Uint8Array;
  };

  export type SqlJsStatic = {
    Database: new (data?: Uint8Array) => Database;
  };

  export type InitSqlJsConfig = {
    locateFile?: (file: string) => string;
  };

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}

