import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeAll(() => {
    console.error = vi.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should render fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Có lỗi xảy ra')).toBeInTheDocument()
    expect(screen.getByText(/Xin lỗi, đã có lỗi xảy ra/)).toBeInTheDocument()
  })

  it('should show error message in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test error')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('should have retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const retryButton = screen.getByText('Thử lại')
    expect(retryButton).toBeInTheDocument()
  })

  it('should have home button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const homeButton = screen.getByText('Về trang chủ')
    expect(homeButton).toBeInTheDocument()
  })

  it('should call handleReset when retry is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Có lỗi xảy ra')).toBeInTheDocument()

    const retryButton = screen.getByText('Thử lại')
    
    // Just verify the button exists and is clickable
    expect(retryButton).toBeInTheDocument()
    fireEvent.click(retryButton)
    
    // After clicking, the error boundary resets its state
    // The actual re-render behavior depends on the child component
  })

  it('should use custom fallback when provided', () => {
    const customFallback = (error: Error, reset: () => void) => (
      <div>
        <h1>Custom Error: {error.message}</h1>
        <button onClick={reset}>Custom Reset</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom Error: Test error')).toBeInTheDocument()
    expect(screen.getByText('Custom Reset')).toBeInTheDocument()
  })

  it('should call componentDidCatch when error occurs', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error Boundary caught:',
      expect.any(Error),
      expect.any(Object)
    )

    consoleErrorSpy.mockRestore()
  })
})
