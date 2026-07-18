

import { TonConnectUIProvider } from '@tonconnect/ui-react';

import { App } from '@/components/App.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.tsx';
import { publicUrl } from '@/helpers/publicUrl.ts';

function ErrorBoundaryError({ error }: { error: unknown }) {
  return (
    <div>
      <p>An unhandled error occurred:</p>
      <blockquote>
        <code>
          {error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error)}
        </code>
      </blockquote>
    </div>
  );
}

export function Root() {
  const publicBaseUrl = import.meta.env.VITE_PUBLIC_URL || '';
  return (
    <ErrorBoundary fallback={ErrorBoundaryError}>
      <TonConnectUIProvider
        enableAndroidBackHandler={false}
        manifestUrl={publicUrl(`${publicBaseUrl}/tonconnect-manifest.json`)}
      >
        <App/>
      </TonConnectUIProvider>
    </ErrorBoundary>
  );
}
