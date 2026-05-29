import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// A child that throws on demand so we can exercise the boundary.
function Boom({ shouldThrow }: { shouldThrow: boolean }): JSX.Element {
  if (shouldThrow) {
    throw new Error('kaboom')
  }
  return <div>healthy child</div>
}

describe('ErrorBoundary', () => {
  // React logs caught errors to console.error; silence it for clean test output.
  let errorSpy: jest.SpyInstance
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary name="Test Region">
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('healthy child')).toBeInTheDocument()
  })

  it('renders the fallback with the region name and message when a child throws', () => {
    render(
      <ErrorBoundary name="Sequencer">
        <Boom shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Sequencer hit an error/)).toBeInTheDocument()
    expect(screen.getByText('kaboom')).toBeInTheDocument()
  })

  it('recovers when "Try again" is clicked and the child no longer throws', () => {
    function Harness(): JSX.Element {
      const [throws, setThrows] = React.useState(true)
      return (
        <ErrorBoundary
          name="Recoverable"
          // Custom fallback that also flips the child to a healthy state on reset.
          fallback={(error, reset) => (
            <button
              onClick={() => {
                setThrows(false)
                reset()
              }}
            >
              retry ({error.message})
            </button>
          )}
        >
          <Boom shouldThrow={throws} />
        </ErrorBoundary>
      )
    }

    render(<Harness />)
    // Fallback shown initially.
    const retry = screen.getByRole('button', { name: /retry \(kaboom\)/ })
    fireEvent.click(retry)
    // After reset + healthy child, the content renders.
    expect(screen.getByText('healthy child')).toBeInTheDocument()
  })

  it('invokes a custom fallback renderer', () => {
    render(
      <ErrorBoundary name="Custom" fallback={(error) => <div>custom: {error.message}</div>}>
        <Boom shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('custom: kaboom')).toBeInTheDocument()
  })
})
