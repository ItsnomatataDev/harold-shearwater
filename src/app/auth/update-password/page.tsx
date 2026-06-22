import { UpdatePasswordForm } from '@/features/auth/components/UpdatePasswordForm'

export default function UpdatePasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-[#151514] px-6"><div className="w-full max-w-md rounded-2xl border border-[#343431] bg-[#1d1d1b] p-7"><p className="text-xs font-semibold uppercase tracking-[.16em] text-sunset">Account security</p><h1 className="mt-3 text-2xl font-semibold text-white">Choose a new password</h1><p className="mt-2 text-sm text-[#898983]">Use at least eight characters and keep it unique to Shearwater.</p><UpdatePasswordForm/></div></main>
}
