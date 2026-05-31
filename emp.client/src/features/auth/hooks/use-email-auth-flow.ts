import { useMemo, useState } from 'react'

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase())

export type EmailAuthStep = 'email' | 'otp' | 'password'

export function useEmailAuthFlow() {
  const [step, setStep] = useState<EmailAuthStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const emailNormalized = useMemo(() => email.trim().toLowerCase(), [email])

  const reset = () => {
    setStep('email')
    setEmail('')
    setOtp('')
    setOtpSent(false)
    setLoading(false)
    setOtpError(null)
    setPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }

  const sendOtp = async () => {
    setOtpError(null)
    if (!isValidEmail(email)) {
      setOtpError('Email không hợp lệ')
      return
    }
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 650))
      const demoOtp = '123456'
      localStorage.setItem('email_otp_demo', demoOtp)
      localStorage.setItem('email_otp_target', emailNormalized)
      setOtpSent(true)
      setStep('otp')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setOtpError(null)
    const expected = localStorage.getItem('email_otp_demo') || ''
    const target = localStorage.getItem('email_otp_target') || ''

    if (!otp || otp.length !== 6) {
      setOtpError('Vui lòng nhập đủ 6 số OTP')
      return
    }
    if (target !== emailNormalized) {
      setOtpError('OTP không khớp email')
      return
    }
    if (otp !== expected) {
      setOtpError('OTP không đúng (demo: 123456)')
      return
    }

    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 350))
      setStep('password')
    } finally {
      setLoading(false)
    }
  }

  const finishPassword = async () => {
    setPasswordError(null)
    if (password.length < 6) {
      setPasswordError('Mật khẩu tối thiểu 6 ký tự')
      return { ok: false as const }
    }
    if (password !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp')
      return { ok: false as const }
    }

    localStorage.setItem(
      'email_auth_demo',
      JSON.stringify({ email: emailNormalized, createdAt: new Date().toISOString() }),
    )
    return { ok: true as const }
  }

  return {
    step,
    email,
    setEmail,
    otp,
    setOtp,
    otpSent,
    loading,
    otpError,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    reset,
    sendOtp,
    verifyOtp,
    finishPassword,
  }
}

