import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp, Compass, ExternalLink, Filter, LoaderCircle, MapPin, Menu, Search, Sparkles, Ticket, Users, X, Zap } from 'lucide-react'
import { apiBase, getEvents, getEventRegistrations, getMyRegistrations, registerForEvent } from './api'

const initialUser = localStorage.getItem('campuspulse-user-id') || ''
const categories = ['All events', 'Academic', 'Arts & culture', 'Community', 'Sports', 'Social']
const palettes = ['violet', 'teal', 'orange', 'blue']

function initials(text = 'CP') { return text.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() }
function labelStatus(status = 'upcoming') { return status.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) }
function categoryFor(event) {
  const value = `${event.title || ''} ${event.status || ''}`.toLowerCase()
  if (/sport|game|match|run|fitness|basketball|football/.test(value)) return 'Sports'
  if (/art|music|film|dance|culture|concert|gallery/.test(value)) return 'Arts & culture'
  if (/study|lecture|academic|research|workshop|career|seminar/.test(value)) return 'Academic'
  if (/volunteer|community|service|meetup|club/.test(value)) return 'Community'
  return 'Social'
}

function App() {
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [tab, setTab] = useState('discover')
  const [activeFilter, setActiveFilter] = useState('All events')
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState(initialUser)
  const [userDraft, setUserDraft] = useState(initialUser)
  const [showUser, setShowUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState(null)
  const [busyEvent, setBusyEvent] = useState('')
  const [organizerEventId, setOrganizerEventId] = useState('')
  const [organizerId, setOrganizerId] = useState('')
  const [attendees, setAttendees] = useState(null)
  const [attendeeError, setAttendeeError] = useState('')

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true)
    setError('')
    try {
      const data = await getEvents()
      setEvents(Array.isArray(data) ? data : [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  const refreshRegistrations = useCallback(async (id = userId) => {
    if (!id.trim()) { setRegistrations([]); return }
    try { setRegistrations(await getMyRegistrations(id.trim())) }
    catch (e) { setNotice(e.message); setRegistrations([]) }
  }, [userId])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { refreshRegistrations() }, [refreshRegistrations])

  const filteredEvents = useMemo(() => events.filter(event => {
    const matchesCategory = activeFilter === 'All events' || categoryFor(event) === activeFilter
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || `${event.title || ''} ${event.status || ''}`.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  }), [events, activeFilter, search])

  const registeredIds = useMemo(() => new Set(registrations.map(item => String(item.event_id))), [registrations])
  const myEvents = useMemo(() => events.filter(event => registeredIds.has(String(event.id))), [events, registeredIds])

  function saveUser() {
    const value = userDraft.trim()
    setUserId(value)
    if (value) localStorage.setItem('campuspulse-user-id', value)
    else localStorage.removeItem('campuspulse-user-id')
    setShowUser(false)
    setNotice(value ? 'Attendee ID saved on this device.' : 'Attendee ID cleared.')
  }

  async function handleRegister(event) {
    if (!userId.trim()) { setSelected(event); setShowUser(true); setNotice('Add your existing attendee ID to register. No account or sign-in is used.'); return }
    setBusyEvent(String(event.id)); setNotice('')
    try {
      await registerForEvent(userId.trim(), event.id)
      setNotice(`You’re on the list for ${event.title}.`)
      await refreshRegistrations(userId)
    } catch (e) { setNotice(e.message) }
    finally { setBusyEvent('') }
  }

  async function loadAttendees(eventId = organizerEventId, ownerId = organizerId) {
    setAttendeeError(''); setAttendees(null)
    if (!eventId.trim() || !ownerId.trim()) { setAttendeeError('Enter the event ID and its organizer ID to view the attendee list.'); return }
    try { setAttendees(await getEventRegistrations(eventId.trim(), ownerId.trim())) }
    catch (e) { setAttendeeError(e.message) }
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" onClick={() => setTab('discover')} aria-label="CampusPulse home">
        <span className="brand-mark"><Zap size={19} fill="currentColor" /></span>
        <span className="brand-word">Campus<span>Pulse</span></span>
        <span className="live-tag"><i /> LIVE</span>
      </a>
      <nav className="main-nav" aria-label="Main navigation">
        <button className={tab === 'discover' ? 'nav-link active' : 'nav-link'} onClick={() => setTab('discover')}><Compass size={16} /> Discover</button>
        <button className={tab === 'passes' ? 'nav-link active' : 'nav-link'} onClick={() => setTab('passes')}><Ticket size={16} /> My passes <span className="nav-count">{registrations.length}</span></button>
        <button className={tab === 'organizer' ? 'nav-link active' : 'nav-link'} onClick={() => setTab('organizer')}><Activity size={16} /> Organizer</button>
      </nav>
      <div className="header-actions">
        <button className="identity-button" onClick={() => { setUserDraft(userId); setShowUser(true) }} title="Set attendee ID, with no sign-in">
          <span className="avatar">{userId ? initials(userId) : <Users size={15} />}</span>
          <span className="identity-label">{userId ? 'Attendee ID set' : 'Set attendee ID'}</span><ChevronDown size={14} />
        </button>
        <button className="mobile-menu" onClick={() => setShowUser(true)} aria-label="Set attendee ID"><Menu /></button>
      </div>
    </header>

    <main id="top">
      <div className="content-wrap">
        {tab === 'discover' && <>
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> YOUR CAMPUS, IN MOTION</div>
              <h1>Make room for<br /><span>the memorable.</span></h1>
              <p>Find your people. Follow your curiosity. Make this semester count.</p>
              <div className="hero-buttons"><button className="button button-primary" onClick={() => document.getElementById('event-feed')?.scrollIntoView({ behavior: 'smooth' })}>Explore events <ArrowRight size={16} /></button><button className="button button-quiet" onClick={() => setTab('passes')}>My passes <Ticket size={16} /></button></div>
              <div className="hero-foot"><span className="avatar-stack"><i>✦</i><i>♫</i><i>⚡</i></span><span>Find your next <b>“glad I went”</b> moment.</span></div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
              <div className="hero-orb"><div className="orb-glow" /><Zap size={54} fill="currentColor" /></div>
              <div className="float-card float-card-top"><span className="float-icon violet"><Sparkles size={16} /></span><span><b>Good things</b><small>happen here</small></span><ArrowUpRight size={16} /></div>
              <div className="float-card float-card-bottom"><span className="float-icon mint"><Users size={16} /></span><span><b>Your people</b><small>are out there</small></span><ArrowDownRight size={16} /></div>
              <div className="spark spark-a">✦</div><div className="spark spark-b">✧</div><div className="spark spark-c">✳</div>
            </div>
            <div className="hero-wash" />
          </section>

          <section className="stats-strip" aria-label="Campus activity">
            <div className="stat-item"><span className="stat-icon violet"><CalendarDays size={17} /></span><span><b>{events.length}</b><small>events to explore</small></span></div>
            <div className="stat-divider" />
            <div className="stat-item"><span className="stat-icon mint"><Ticket size={17} /></span><span><b>{registrations.length}</b><small>your passes</small></span></div>
            <div className="stat-divider" />
            <div className="stat-item"><span className="stat-icon orange"><Zap size={17} /></span><span><b>Make it yours</b><small>one event at a time</small></span></div>
            <div className="api-status"><i className={error ? 'offline' : 'online'} />{error ? 'API offline' : 'Connected to campus'}</div>
          </section>

          <section className="event-section" id="event-feed">
            <div className="section-heading"><div><div className="section-kicker">THE CAMPUS CALENDAR</div><h2>Find your next thing<span>.</span></h2><p>Little plans make the best stories.</p></div><button className="refresh-button" onClick={() => refresh(true)} disabled={refreshing}><LoaderCircle className={refreshing ? 'spin' : ''} size={15} /> {refreshing ? 'Refreshing' : 'Refresh events'}</button></div>
            <div className="feed-tools"><div className="filters" role="tablist" aria-label="Event categories"><Filter size={15} className="filter-icon" />{categories.map((category, i) => <button key={category} role="tab" aria-selected={activeFilter === category} className={`filter-chip ${activeFilter === category ? 'selected' : ''}`} onClick={() => setActiveFilter(category)}>{i === 0 && <Sparkles size={13} />}{category}</button>)}</div><label className="search-box"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events" aria-label="Search events" />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}</label></div>

            {error && <div className="notice error-notice"><CircleHelp size={18} /><div><b>Couldn’t load events</b><span>{error}</span><button onClick={() => refresh()}>Try again</button></div></div>}
            {notice && <div className="toast" role="status"><Check size={15} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
            {loading ? <div className="loading-state"><LoaderCircle className="spin" /><span>Finding what’s happening…</span></div> : !error && filteredEvents.length === 0 ? <div className="empty-state"><span className="empty-symbol"><Search /></span><h3>{events.length ? 'Nothing in this filter yet' : 'The calendar is getting ready'}</h3><p>{events.length ? 'Try another category or search.' : 'New campus events will show here as soon as they’re posted.'}</p></div> : <div className="event-grid">{filteredEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} registered={registeredIds.has(String(event.id))} busy={busyEvent === String(event.id)} onOpen={() => setSelected(event)} onRegister={() => handleRegister(event)} />)}</div>}
          </section>
        </>}

        {tab === 'passes' && <section className="page-section">
          <div className="section-heading"><div><div className="section-kicker">YOUR PLANS, ALL TOGETHER</div><h2>My passes<span>.</span></h2><p>Your registrations, ready when you are.</p></div><span className="count-pill"><Ticket size={15} /> {registrations.length} {registrations.length === 1 ? 'pass' : 'passes'}</span></div>
          {!userId && <div className="notice"><CircleHelp size={18} /><div><b>Set your attendee ID to view your passes</b><span>Use the ID already in the users table. This does not create an account or sign you in.</span><button onClick={() => { setUserDraft(''); setShowUser(true) }}>Enter attendee ID</button></div></div>}
          {userId && registrations.length === 0 && <div className="empty-state"><span className="empty-symbol"><Ticket /></span><h3>No passes yet</h3><p>When you register for an event, it will appear here.</p><button className="button button-primary" onClick={() => setTab('discover')}>Discover events <ArrowRight size={16} /></button></div>}
          {userId && registrations.length > 0 && <div className="passes-list">{registrations.map(reg => { const event = events.find(item => String(item.id) === String(reg.event_id)); return <div className="pass-row" key={reg.id}><div className="pass-stamp"><Ticket size={21} /></div><div className="pass-details"><span className="section-kicker">CAMPUSPULSE PASS</span><h3>{event?.title || `Event ${String(reg.event_id).slice(0, 8)}`}</h3><p><CalendarDays size={14} /> Registered {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : 'successfully'}</p></div><span className="status-pill"><i /> Registered</span></div>})}</div>}
        </section>}

        {tab === 'organizer' && <section className="page-section">
          <div className="section-heading"><div><div className="section-kicker">FOR THE PEOPLE WHO MAKE IT HAPPEN</div><h2>Organizer space<span>.</span></h2><p>View the attendee list for an event you organize.</p></div><span className="organizer-icon"><Users size={20} /></span></div>
          <div className="organizer-panel"><div className="panel-intro"><span className="panel-icon"><Users size={19} /></span><div><h3>Event attendees</h3><p>Look up registrations using the event and organizer IDs.</p></div></div><div className="organizer-form"><label>Event ID<input value={organizerEventId} onChange={e => setOrganizerEventId(e.target.value)} placeholder="Paste event UUID" /></label><label>Organizer ID<input value={organizerId} onChange={e => setOrganizerId(e.target.value)} placeholder="Paste organizer UUID" /></label><button className="button button-primary" onClick={() => loadAttendees()}><Search size={15} /> View attendees</button></div><p className="panel-footnote">IDs are supplied directly because this app has no sign-in. The backend endpoint also does not verify who is making the request.</p>{attendeeError && <div className="inline-error">{attendeeError}</div>}{attendees && <div className="attendee-results"><div className="attendee-heading"><b>Attendees</b><span>{attendees.length} registered</span></div>{attendees.length === 0 ? <p className="muted">No registrations yet.</p> : attendees.map(person => <div className="attendee-row" key={person.id}><span className="avatar">{initials(String(person.user_id))}</span><span className="attendee-id">{person.user_id}</span><span className="attendee-date">{person.created_at ? new Date(person.created_at).toLocaleDateString() : 'Registered'}</span></div>)}</div>}</div>
        </section>}
      </div>
    </main>

    <footer className="footer"><div className="footer-inner"><a className="brand footer-brand" href="#top"><span className="brand-mark"><Zap size={15} fill="currentColor" /></span><span className="brand-word">Campus<span>Pulse</span></span></a><span>Made for the moments between classes.</span><a className="backend-link" href={apiBase} target="_blank" rel="noreferrer">Backend status <ExternalLink size={13} /></a></div></footer>

    {selected && <EventModal event={selected} registered={registeredIds.has(String(selected.id))} busy={busyEvent === String(selected.id)} onClose={() => setSelected(null)} onRegister={() => handleRegister(selected)} />}
    {showUser && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowUser(false) }}><div className="modal identity-modal" role="dialog" aria-modal="true" aria-labelledby="identity-title"><button className="modal-close" onClick={() => setShowUser(false)} aria-label="Close"><X size={18} /></button><div className="modal-mark"><Users size={21} /></div><div className="section-kicker">NO ACCOUNT NEEDED</div><h2 id="identity-title">Your attendee ID</h2><p>Enter an existing user ID from the database to register for events and view your passes. It stays in this browser only.</p><label className="modal-input-label">Attendee ID<input autoFocus value={userDraft} onChange={e => setUserDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveUser()} placeholder="Paste user UUID" /></label><div className="modal-actions"><button className="button button-quiet" onClick={() => { setUserDraft(''); setUserId(''); localStorage.removeItem('campuspulse-user-id'); setShowUser(false) }}>Clear ID</button><button className="button button-primary" onClick={saveUser}>Save ID <ArrowRight size={15} /></button></div><div className="privacy-hint"><CircleHelp size={14} /> No passwords, sign-up, or login are used.</div></div></div>}
    <div className="mobile-dock"><button className={tab === 'discover' ? 'dock-active' : ''} onClick={() => setTab('discover')}><Compass size={18} /><span>Discover</span></button><button className={tab === 'passes' ? 'dock-active' : ''} onClick={() => setTab('passes')}><Ticket size={18} /><span>My passes</span></button><button className={tab === 'organizer' ? 'dock-active' : ''} onClick={() => setTab('organizer')}><Users size={18} /><span>Organizer</span></button></div>
  </div>
}

function EventCard({ event, index, registered, busy, onOpen, onRegister }) {
  const category = categoryFor(event)
  const palette = palettes[index % palettes.length]
  return <article className={`event-card ${palette}`}>
    <button className="card-art" onClick={onOpen} aria-label={`View ${event.title} details`}><div className="art-grain" /><div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" /><div className="art-shape"><span>{category === 'Academic' ? '✳' : category === 'Sports' ? '↗' : category === 'Arts & culture' ? '♫' : category === 'Community' ? '✦' : '✧'}</span></div><span className="card-category">{category}</span><span className="art-number">{String(index + 1).padStart(2, '0')} / CAMPUS</span></button>
    <div className="card-body"><div className="card-meta"><span className="status-label"><i />{labelStatus(event.status || 'upcoming')}</span><span className="capacity"><Users size={13} />{event.capacity ?? 'Open'}</span></div><button className="card-title" onClick={onOpen}>{event.title || 'Untitled campus event'}<ArrowUpRight size={17} /></button><div className="card-location"><MapPin size={14} /><span>Campus event</span><span className="meta-separator">·</span><CalendarDays size={14} /><span>Date to be announced</span></div><div className="card-bottom"><span className="organizer-avatar">{initials(String(event.organizer_id || 'CP'))}</span><span className="organizer-name">Campus organizer</span><button className={registered ? 'card-action registered' : 'card-action'} disabled={busy || registered} onClick={onRegister}>{busy ? <LoaderCircle className="spin" size={15} /> : registered ? <><Check size={14} /> Joined</> : <>Join <ArrowRight size={14} /></>}</button></div></div>
  </article>
}

function EventModal({ event, registered, busy, onClose, onRegister }) {
  const category = categoryFor(event)
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="modal event-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button><div className={`modal-art ${palettes[(String(event.id).length + (event.title?.length || 0)) % palettes.length]}`}><Sparkles size={34} /><span>{category}</span></div><div className="card-meta"><span className="status-label"><i />{labelStatus(event.status || 'upcoming')}</span><span className="capacity"><Users size={13} /> Capacity {event.capacity ?? 'open'}</span></div><h2 id="event-modal-title">{event.title}</h2><p className="modal-copy">A campus gathering made for good conversations and new memories. Event details and timing will be shared by the organizer.</p><div className="detail-lines"><span><MapPin size={16} /> Campus event</span><span><CalendarDays size={16} /> Date to be announced</span></div><button className="button button-primary modal-register" disabled={registered || busy} onClick={onRegister}>{busy ? <LoaderCircle className="spin" size={16} /> : registered ? <><Check size={16} /> You’re registered</> : <>Register for this event <ArrowRight size={16} /></>}</button><p className="modal-note">Registration uses your attendee ID. There is no login or sign-up.</p></div></div>
}

export default App
