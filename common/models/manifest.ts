/**
 * Manifest of the application
 */
export interface Manifest {
  author: string
  short_name: string
  appId: string
  name: string
  version: string
  icons: {
    src:string,
    type:string,
    sizes:string
  }[]
}
