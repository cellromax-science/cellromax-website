/**
 * =============================================================
 * Super Admin 시드 스크립트
 * Project: Cellromax-Homepage_Renewal (셀로맥스사이언스)
 * =============================================================
 *
 * Supabase Auth Admin API를 사용하여 Super Admin 계정을 생성하고
 * admin_profiles 테이블에 프로필 데이터를 삽입합니다.
 *
 * 사전 조건:
 *   1. supabase/migrations/20260220000003_seed_super_admin.sql 이 적용된 상태
 *   2. .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
 *
 * 실행 방법:
 *   npx tsx scripts/seed-admin.ts
 *
 * 비밀번호 전달 방법 (택 1):
 *   1. 환경변수:  ADMIN_PASSWORD=YourPassword npx tsx scripts/seed-admin.ts
 *   2. .env.local에 ADMIN_PASSWORD=YourPassword 추가
 *   3. 인자:      npx tsx scripts/seed-admin.ts --password YourPassword
 *
 * 멱등성:
 *   - 이미 동일 이메일의 auth.users가 존재하면 기존 사용자를 사용합니다.
 *   - admin_profiles는 ON CONFLICT DO UPDATE로 중복 실행에 안전합니다.
 * =============================================================
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// -----------------------------------------------------------------
// 1. 환경변수 로드 (.env.local 파싱)
// -----------------------------------------------------------------
function loadEnvFile(): void {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      // 주석과 빈 줄 무시
      if (!trimmed || trimmed.startsWith('#')) continue

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue

      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()

      // 이미 설정된 환경변수는 덮어쓰지 않음 (CLI 우선)
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  } catch {
    // .env.local이 없으면 환경변수에서만 읽음
    console.warn('[WARN] .env.local 파일을 찾을 수 없습니다. 환경변수에서 설정을 읽습니다.')
  }
}

// -----------------------------------------------------------------
// 2. CLI 인자에서 비밀번호 파싱
// -----------------------------------------------------------------
function getPasswordFromArgs(): string | undefined {
  const args = process.argv.slice(2)
  const pwIndex = args.indexOf('--password')
  if (pwIndex !== -1 && args[pwIndex + 1]) {
    return args[pwIndex + 1]
  }
  return undefined
}

// -----------------------------------------------------------------
// 3. Super Admin 설정
// -----------------------------------------------------------------
const SUPER_ADMIN = {
  email: 'developer@cellromax.com',
  name: '양인규',
  role: 'super_admin' as const,
  department: null,
} as const

// -----------------------------------------------------------------
// 4. 메인 시드 함수
// -----------------------------------------------------------------
async function seedSuperAdmin(): Promise<void> {
  // 환경변수 로드
  loadEnvFile()

  // 필수 환경변수 검증
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ERROR] 필수 환경변수가 설정되지 않았습니다:')
    if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    if (!serviceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    console.error('\n.env.local 파일을 확인하거나 환경변수를 직접 설정해주세요.')
    process.exit(1)
  }

  // 비밀번호 획득 (CLI 인자 > 환경변수)
  const password = getPasswordFromArgs() || process.env.ADMIN_PASSWORD

  if (!password) {
    console.error('[ERROR] Super Admin 비밀번호가 제공되지 않았습니다.')
    console.error('')
    console.error('다음 방법 중 하나로 비밀번호를 전달해주세요:')
    console.error('  1. ADMIN_PASSWORD=YourPassword npx tsx scripts/seed-admin.ts')
    console.error('  2. npx tsx scripts/seed-admin.ts --password YourPassword')
    console.error('  3. .env.local 파일에 ADMIN_PASSWORD=YourPassword 추가')
    process.exit(1)
  }

  // 비밀번호 최소 요구사항 검증
  if (password.length < 8) {
    console.error('[ERROR] 비밀번호는 최소 8자 이상이어야 합니다.')
    process.exit(1)
  }

  // Supabase Admin 클라이언트 생성 (service_role 키 사용)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('='.repeat(60))
  console.log(' Cellromax Super Admin 시드 스크립트')
  console.log('='.repeat(60))
  console.log(`  이메일: ${SUPER_ADMIN.email}`)
  console.log(`  이름:   ${SUPER_ADMIN.name}`)
  console.log(`  역할:   ${SUPER_ADMIN.role}`)
  console.log('='.repeat(60))
  console.log('')

  // ---------------------------------------------------------------
  // Step 1: auth.users에 사용자 생성 (또는 기존 사용자 확인)
  // ---------------------------------------------------------------
  console.log('[1/3] Auth 사용자 생성 중...')

  let userId: string

  // 먼저 기존 사용자가 있는지 이메일로 확인
  const { data: existingUsers, error: listError } =
    await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('[ERROR] 사용자 목록 조회 실패:', listError.message)
    process.exit(1)
  }

  const existingUser = existingUsers.users.find(
    (u) => u.email === SUPER_ADMIN.email
  )

  if (existingUser) {
    userId = existingUser.id
    console.log(`  -> 기존 사용자 발견: ${userId}`)
    console.log('  -> 기존 Auth 사용자를 사용합니다.')
  } else {
    // 새 사용자 생성
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: SUPER_ADMIN.email,
        password: password,
        email_confirm: true, // 이메일 인증 건너뛰기 (관리자 직접 생성)
      })

    if (createError) {
      console.error('[ERROR] Auth 사용자 생성 실패:', createError.message)
      process.exit(1)
    }

    userId = newUser.user.id
    console.log(`  -> 새 사용자 생성 완료: ${userId}`)
  }

  // ---------------------------------------------------------------
  // Step 2: admin_profiles에 프로필 삽입 (seed_admin_profile 함수 호출)
  // ---------------------------------------------------------------
  console.log('[2/3] Admin 프로필 생성 중...')

  const { error: rpcError } = await supabase.rpc('seed_admin_profile', {
    admin_id: userId,
    admin_email: SUPER_ADMIN.email,
    admin_name: SUPER_ADMIN.name,
    admin_role: SUPER_ADMIN.role,
    admin_dept: SUPER_ADMIN.department,
  })

  if (rpcError) {
    console.error('[ERROR] Admin 프로필 생성 실패:', rpcError.message)
    console.error('')
    console.error('마이그레이션이 적용되었는지 확인해주세요:')
    console.error('  npx supabase db push')
    process.exit(1)
  }

  console.log('  -> Admin 프로필 생성/업데이트 완료')

  // ---------------------------------------------------------------
  // Step 3: 결과 검증
  // ---------------------------------------------------------------
  console.log('[3/3] 결과 검증 중...')

  const { data: profile, error: verifyError } = await supabase
    .from('admin_profiles')
    .select('id, email, name, role, department, is_active')
    .eq('id', userId)
    .single()

  if (verifyError || !profile) {
    console.error('[ERROR] 프로필 검증 실패:', verifyError?.message)
    process.exit(1)
  }

  console.log('  -> 검증 성공!')
  console.log('')
  console.log('='.repeat(60))
  console.log(' Super Admin 계정 생성 완료')
  console.log('='.repeat(60))
  console.log(`  ID:     ${profile.id}`)
  console.log(`  이메일: ${profile.email}`)
  console.log(`  이름:   ${profile.name}`)
  console.log(`  역할:   ${profile.role}`)
  console.log(`  부서:   ${profile.department ?? '(없음)'}`)
  console.log(`  활성:   ${profile.is_active}`)
  console.log('='.repeat(60))
  console.log('')
  console.log('이제 다음 URL에서 로그인할 수 있습니다:')
  console.log('  http://localhost:3000/admin/login')
  console.log('')
}

// -----------------------------------------------------------------
// 5. 실행
// -----------------------------------------------------------------
seedSuperAdmin().catch((err) => {
  console.error('[FATAL] 예상하지 못한 오류:', err)
  process.exit(1)
})
