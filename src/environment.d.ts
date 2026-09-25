declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL_PROJECT_PRODUCTION_URL: string
      // Optional on purpose. Without them Payload logs mail to the console
      // instead of sending, which is right locally and loud in production.
      RESEND_API_KEY?: string
      EMAIL_FROM_ADDRESS?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
