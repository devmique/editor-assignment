import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Only run tests if Supabase is configured
const isConfigured = supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase')

const describeIfConfigured = isConfigured ? describe : describe.skip

describeIfConfigured('Document CRUD', () => {
  let supabase: ReturnType<typeof createClient>
  let testUserId: string
  let testDocId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey)

    // Sign up test user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'test-password-123',
    })

    if (authError) throw authError
    testUserId = authData.user?.id || ''
  })

  afterAll(async () => {
    // Cleanup
    if (testDocId) {
      await supabase.from('documents').delete().eq('id', testDocId)
    }
  })

  test('should create a new document', async () => {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: 'Test Document',
        content: '<h1>Test</h1><p>Hello world</p>',
        owner_id: testUserId,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data?.title).toBe('Test Document')
    expect(data?.content).toContain('Hello world')
    testDocId = data?.id || ''
  })

  test('should update document title', async () => {
    const { error } = await supabase
      .from('documents')
      .update({ title: 'Updated Title' })
      .eq('id', testDocId)

    expect(error).toBeNull()

    const { data } = await supabase
      .from('documents')
      .select('title')
      .eq('id', testDocId)
      .single()

    expect(data?.title).toBe('Updated Title')
  })

  test('should update document content', async () => {
    const newContent = '<h1>Updated</h1><p>New content here</p>'
    const { error } = await supabase
      .from('documents')
      .update({ content: newContent })
      .eq('id', testDocId)

    expect(error).toBeNull()

    const { data } = await supabase
      .from('documents')
      .select('content')
      .eq('id', testDocId)
      .single()

    expect(data?.content).toBe(newContent)
  })

  test('should fetch user documents', async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', testUserId)

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data!.length).toBeGreaterThanOrEqual(1)
  })
})

describeIfConfigured('Sharing', () => {
  let supabase: ReturnType<typeof createClient>
  let ownerUserId: string
  let sharedUserId: string
  let testDocId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey)

    // Create two test users
    const ownerEmail = `owner-${Date.now()}@example.com`
    const sharedEmail = `shared-${Date.now()}@example.com`

    const { data: ownerAuth } = await supabase.auth.signUp({
      email: ownerEmail,
      password: 'test-password-123',
    })
    ownerUserId = ownerAuth?.user?.id || ''

    const { data: sharedAuth } = await supabase.auth.signUp({
      email: sharedEmail,
      password: 'test-password-123',
    })
    sharedUserId = sharedAuth?.user?.id || ''

    // Create a document as owner
    const { data: doc } = await supabase
      .from('documents')
      .insert({
        title: 'Shared Test Doc',
        content: '<p>Shared content</p>',
        owner_id: ownerUserId,
      })
      .select()
      .single()

    testDocId = doc?.id || ''
  })

  afterAll(async () => {
    if (testDocId) {
      await supabase.from('document_shares').delete().eq('document_id', testDocId)
      await supabase.from('documents').delete().eq('id', testDocId)
    }
  })

  test('should share document with another user', async () => {
    const { error } = await supabase
      .from('document_shares')
      .insert({
        document_id: testDocId,
        user_id: sharedUserId,
        permission: 'edit',
      })

    expect(error).toBeNull()
  })

  test('should not allow duplicate shares', async () => {
    const { error } = await supabase
      .from('document_shares')
      .insert({
        document_id: testDocId,
        user_id: sharedUserId,
        permission: 'edit',
      })

    expect(error).toBeTruthy()
    expect(error?.code).toBe('23505') // unique violation
  })
})
