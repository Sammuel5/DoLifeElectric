// Pages Router entry — required so Next.js detects a pages/ directory.
// All actual routes live in the App Router (app/ directory).
// This file does nothing but prevent "Couldn't find a pages directory" errors.
import '../app/globals.css'

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
