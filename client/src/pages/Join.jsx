import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

/**
 * /join?code=REVIEW-XXXX&email=someone@company.com
 *
 * Auto-reads URL params and redirects to /auth with pre-filled values
 * so the employee sees their email + code already populated.
 */
export default function Join() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code') ?? ''
    const email = searchParams.get('email') ?? ''

    // Pass the pre-fill values via location.state into auth page
    navigate('/auth', {
      replace: true,
      state: {
        role: 'employee',
        prefillCode: code,
        prefillEmail: email
      }
    })
  }, [navigate, searchParams])

  // Brief loading state while redirect happens
  return (
    <div className="center-screen">
      <span className="loader" />
    </div>
  )
}
