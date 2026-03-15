'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-red-50 text-red-900">
          <h2 className="text-2xl font-bold mb-4">¡Algo salió mal!</h2>
          <p className="mb-4 font-mono text-sm bg-white p-4 border border-red-200 rounded max-w-2xl overflow-auto">
            {error.message}
          </p>
          {error.stack && (
            <pre className="text-xs p-2 bg-gray-100 rounded overflow-auto max-h-64 w-full">
              {error.stack}
            </pre>
          )}
          <button
            onClick={() => reset()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
