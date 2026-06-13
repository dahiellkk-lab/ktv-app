const { ipcRenderer } = require('electron')
const path = require('path')
const fs = require('fs')

// ── 歌曲資料庫 ──────────────────────────────────────────────────
const SONGS = [
  { id:1,  name:'月亮代表我的心', artist:'鄧麗君',   dur:'3:52', lang:'mandarin',  file:null },
  { id:2,  name:'小幸運',         artist:'田馥甄',   dur:'4:34', lang:'mandarin',  file:null },
  { id:3,  name:'告白氣球',       artist:'周杰倫',   dur:'3:32', lang:'mandarin',  file:null },
  { id:4,  name:'愛你',           artist:'王心凌',   dur:'3:28', lang:'mandarin',  file:null },
  { id:5,  name:'稻香',           artist:'周杰倫',   dur:'3:42', lang:'mandarin',  file:null },
  { id:6,  name:'夜曲',           artist:'周杰倫',   dur:'4:02', lang:'mandarin',  file:null },
  { id:7,  name:'一起走過的日子', artist:'劉德華',   dur:'4:18', lang:'mandarin',  file:null },
  { id:8,  name:'浪人情歌',       artist:'伍佰',     dur:'4:45', lang:'mandarin',  file:null },
  { id:9,  name:'情非得已',       artist:'庾澄慶',   dur:'4:12', lang:'mandarin',  file:null },
  { id:10, name:'流星雨',         artist:'F4',       dur:'4:01', lang:'mandarin',  file:null },
  { id:11, name:'家後',           artist:'江蕙',     dur:'4:22', lang:'taiwanese', file:null },
  { id:12, name:'落雨聲',         artist:'鄭進一',   dur:'3:55', lang:'taiwanese', file:null },
  { id:13, name:'愛拚才會贏',     artist:'葉啟田',   dur:'4:30', lang:'taiwanese', file:null },
  { id:14, name:'甲你攬牢牢',     artist:'黃乙玲',   dur:'4:10', lang:'taiwanese', file:null },
  { id:15, name:'ドラえもん',     artist:'星野源',   dur:'4:00', lang:'japanese',  file:null },
  { id:16, name:'Lemon',          artist:'米津玄師', dur:'4:49', lang:'japanese',  file:null },
  { id:17, name:'夜に駆ける',     artist:'YOASOBI',  dur:'4:10', lang:'japanese',  file:null },
  { id:18, name:'残酷な天使のテーゼ', artist:'高橋洋子', dur:'4:39', lang:'japanese', file:null },
  { id:19, name:'Shape of You',   artist:'Ed Sheeran', dur:'3:54', lang:'english', file:null },
  { id:20, name:'Bohemian Rhapsody', artist:'Queen', dur:'5:55', lang:'english',   file:null },
]

// 歌詞對照（示範）
const LYRICS = {
  1: ['你問我愛你有多深','我愛你有幾分','我的情也真','我的愛也真','月亮代表我的心','你問我愛你有多深','我愛你有幾分','你去想一想','你去看一看','月亮代表我的心','輕輕的一個吻','已經打動我的心','深深的一段情','教我思念到如今','你問我愛你有多深','我愛你有幾分','你去想一想','你去看一看','月亮代表我的心'],
  2: ['我沒有多餘的傷悲','我沒有那麼多的眼淚','只是不想要再讓你累','嗯嗯','我沒有多餘的勇氣','我沒有那麼多的運氣','只是想給你最後的鼓勵','嗯嗯','然後輕輕地說聲再見','讓彼此都能夠換換空氣','你知道我愛你','你是我的小幸運'],
  3: ['雨下整夜','我的愛溢出就像雨水','院子落葉','跟我的思念厚厚一疊','幾句是非','也無法將我的熱情冷卻','You are my girl friend','You are my girlfriend','你甜甜的讓我融化在此刻'],
}

// ── 狀態 ────────────────────────────────────────────────────────
let state = {
  queue: [],
  currentTab: 'all',
  query: '',
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 80,
  shuffle: false,
  repeat: false,
  timer: null,
  lyricIdx: 0,
  lyricTimer: null,
  nextId: 100,
}

const audio = document.getElementById('audio-player')

// ── 工具函式 ─────────────────────────────────────────────────────
function durToSec(d) {
  const [m, s] = d.split(':').map(Number)
  return m * 60 + s
}
function secToStr(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0')
}
function showToast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2200)
}

// ── 渲染歌曲列表 ─────────────────────────────────────────────────
function renderSongs() {
  const list = document.getElementById('song-list')
  const filtered = SONGS.filter(s => {
    const matchLang = state.currentTab === 'all' || s.lang === state.currentTab
    const q = state.query.toLowerCase()
    return matchLang && (!q || s.name.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
  })
  if (!filtered.length) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#555577;font-size:13px;">找不到歌曲</div>'
    return
  }
  list.innerHTML = filtered.map((s, i) => `
    <div class="song-item${state.queue[0]?.id === s.id ? ' playing' : ''}" data-id="${s.id}">
      <span class="song-num">${i+1}</span>
      <div class="song-info">
        <div class="song-name">${s.name}</div>
        <div class="song-singer">${s.artist}</div>
      </div>
      <span class="song-dur">${s.dur}</span>
      <button class="song-add" data-id="${s.id}">＋ 點唱</button>
    </div>
  `).join('')

  list.querySelectorAll('.song-item').forEach(el => {
    el.addEventListener('click', () => addToQueue(parseInt(el.dataset.id)))
  })
  list.querySelectorAll('.song-add').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      addToQueue(parseInt(btn.dataset.id))
    })
  })
}

// ── 佇列操作 ─────────────────────────────────────────────────────
function addToQueue(id) {
  const song = SONGS.find(s => s.id === id)
  if (!song) return
  const wasEmpty = state.queue.length === 0
  state.queue.push({ ...song })
  renderQueue()
  renderSongs()
  showToast(`✅ 已點唱：${song.name}`)
  if (wasEmpty) loadAndPlay(0)
}

function removeFromQueue(idx) {
  const wasCurrent = idx === 0
  state.queue.splice(idx, 1)
  if (wasCurrent) {
    clearInterval(state.timer)
    clearInterval(state.lyricTimer)
    if (state.queue.length > 0) loadAndPlay(0)
    else {
      state.isPlaying = false
      updatePlayBtn()
      setProgress(0, 0)
      document.getElementById('np-title').textContent = '—'
      document.getElementById('np-artist').textContent = '請點唱下一首'
    }
  }
  renderQueue()
  renderSongs()
}

function clearQueue() {
  clearInterval(state.timer)
  clearInterval(state.lyricTimer)
  state.queue = []
  state.isPlaying = false
  audio.pause()
  audio.src = ''
  updatePlayBtn()
  setProgress(0, 0)
  renderQueue()
  renderSongs()
  showToast('已清除佇列')
}

function renderQueue() {
  const list = document.getElementById('queue-list')
  document.getElementById('queue-count-label').textContent = `共 ${state.queue.length} 首`
  if (!state.queue.length) {
    list.innerHTML = '<div class="queue-empty">尚未點唱任何歌曲<br><small>從左側點擊加入</small></div>'
    return
  }
  list.innerHTML = state.queue.map((s, i) => `
    <div class="queue-item${i === 0 ? ' current' : ''}">
      ${i === 0 ? '<span class="q-badge">唱</span>' : `<span class="q-num">${i+1}</span>`}
      <div class="q-info">
        <div class="q-name">${s.name}</div>
        <div class="q-artist">${s.artist}</div>
      </div>
      <button class="q-del" data-idx="${i}">✕</button>
    </div>
  `).join('')
  list.querySelectorAll('.q-del').forEach(btn => {
    btn.addEventListener('click', () => removeFromQueue(parseInt(btn.dataset.idx)))
  })
}

// ── 播放控制 ─────────────────────────────────────────────────────
function loadAndPlay(qIdx) {
  if (state.queue.length === 0) return
  const song = state.queue[qIdx || 0]
  document.getElementById('np-title').textContent = song.name
  document.getElementById('np-artist').textContent = song.artist
  document.getElementById('lyrics-song-title').textContent = song.name
  document.getElementById('lyrics-artist').textContent = song.artist
  state.duration = durToSec(song.dur)
  state.progress = 0
  setProgress(0, state.duration)

  // 如果有本地音檔
  if (song.file) {
    audio.src = song.file
    audio.volume = state.volume / 100
    audio.play().catch(() => {})
  } else {
    audio.src = ''
  }

  startTimer()
  renderLyrics(song.id)
  startLyricTimer(song.id)
  state.isPlaying = true
  updatePlayBtn()
}

function startTimer() {
  clearInterval(state.timer)
  state.timer = setInterval(() => {
    if (!state.isPlaying) return
    state.progress++
    setProgress(state.progress, state.duration)
    if (state.progress >= state.duration) {
      clearInterval(state.timer)
      handleSongEnd()
    }
  }, 1000)
}

function handleSongEnd() {
  if (state.repeat) {
    state.progress = 0
    loadAndPlay(0)
    return
  }
  state.queue.shift()
  renderQueue()
  renderSongs()
  if (state.queue.length > 0) {
    if (state.shuffle) {
      const ri = Math.floor(Math.random() * state.queue.length)
      const tmp = state.queue[0]
      state.queue[0] = state.queue[ri]
      state.queue[ri] = tmp
      renderQueue()
    }
    loadAndPlay(0)
  } else {
    state.isPlaying = false
    updatePlayBtn()
    document.getElementById('np-title').textContent = '—'
    document.getElementById('np-artist').textContent = '播放結束'
  }
}

function togglePlay() {
  if (state.queue.length === 0) { showToast('請先點唱一首歌曲'); return }
  state.isPlaying = !state.isPlaying
  if (state.isPlaying) {
    startTimer()
    if (audio.src) audio.play().catch(() => {})
  } else {
    clearInterval(state.timer)
    if (audio.src) audio.pause()
  }
  updatePlayBtn()
}

function stopSong() {
  clearInterval(state.timer)
  clearInterval(state.lyricTimer)
  state.isPlaying = false
  state.progress = 0
  audio.pause()
  audio.currentTime = 0
  setProgress(0, state.duration)
  updatePlayBtn()
}

function skipNext() {
  clearInterval(state.timer)
  clearInterval(state.lyricTimer)
  state.queue.shift()
  renderQueue()
  renderSongs()
  if (state.queue.length > 0) loadAndPlay(0)
  else { stopSong(); showToast('佇列已結束') }
}

function skipPrev() {
  state.progress = 0
  audio.currentTime = 0
  setProgress(0, state.duration)
  startLyricTimer(state.queue[0]?.id)
  showToast('重播：' + (state.queue[0]?.name || ''))
}

function updatePlayBtn() {
  const btn = document.getElementById('btn-play')
  btn.textContent = state.isPlaying ? '⏸' : '▶'
}

function setProgress(cur, total) {
  const pct = total ? Math.min(100, (cur / total) * 100) : 0
  document.getElementById('progress-fill').style.width = pct + '%'
  document.getElementById('progress-thumb').style.left = pct + '%'
  document.getElementById('cur-time').textContent = secToStr(cur)
  document.getElementById('tot-time').textContent = secToStr(total)
}

// ── 歌詞 ─────────────────────────────────────────────────────────
function renderLyrics(songId) {
  const lines = LYRICS[songId] || ['（歌詞未收錄）', '請匯入本地音樂檔案', '盡情享受音樂時光 🎶']
  const container = document.getElementById('lyrics-lines')
  container.innerHTML = lines.map((l, i) => `<div class="lyric-line" data-idx="${i}">${l}</div>`).join('')
  state.lyricIdx = 0
  highlightLyric(0)
}

function highlightLyric(idx) {
  const lines = document.querySelectorAll('.lyric-line')
  lines.forEach((el, i) => {
    el.classList.remove('active', 'prev')
    if (i === idx) el.classList.add('active')
    else if (i === idx - 1 || i === idx - 2) el.classList.add('prev')
  })
  // 自動捲動
  const active = document.querySelector('.lyric-line.active')
  if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function startLyricTimer(songId) {
  clearInterval(state.lyricTimer)
  const lines = LYRICS[songId] || ['（歌詞未收錄）']
  const interval = Math.floor((state.duration / lines.length) * 1000)
  state.lyricIdx = 0
  state.lyricTimer = setInterval(() => {
    if (!state.isPlaying) return
    state.lyricIdx = Math.min(state.lyricIdx + 1, lines.length - 1)
    highlightLyric(state.lyricIdx)
  }, interval)
}

// ── 事件綁定 ─────────────────────────────────────────────────────
document.getElementById('btn-play').addEventListener('click', togglePlay)
document.getElementById('btn-stop').addEventListener('click', stopSong)
document.getElementById('btn-next').addEventListener('click', skipNext)
document.getElementById('btn-prev').addEventListener('click', skipPrev)
document.getElementById('clear-queue').addEventListener('click', clearQueue)

document.getElementById('btn-shuffle').addEventListener('click', () => {
  state.shuffle = !state.shuffle
  document.getElementById('btn-shuffle').classList.toggle('active', state.shuffle)
  showToast(state.shuffle ? '已開啟隨機播放' : '已關閉隨機播放')
})
document.getElementById('btn-repeat').addEventListener('click', () => {
  state.repeat = !state.repeat
  document.getElementById('btn-repeat').classList.toggle('active', state.repeat)
  showToast(state.repeat ? '已開啟單曲循環' : '已關閉循環')
})

document.getElementById('vol-slider').addEventListener('input', e => {
  state.volume = parseInt(e.target.value)
  document.getElementById('vol-val').textContent = state.volume
  audio.volume = state.volume / 100
})

document.getElementById('search-box').addEventListener('input', e => {
  state.query = e.target.value
  renderSongs()
})

document.getElementById('tabs').addEventListener('click', e => {
  const tab = e.target.closest('.tab')
  if (!tab) return
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  tab.classList.add('active')
  state.currentTab = tab.dataset.lang
  renderSongs()
})

document.getElementById('progress-bar').addEventListener('click', e => {
  if (!state.duration) return
  const bar = document.getElementById('progress-bar')
  const pct = (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth
  state.progress = Math.floor(pct * state.duration)
  if (audio.src) audio.currentTime = state.progress
  setProgress(state.progress, state.duration)
})

// 匯入本地音樂
document.getElementById('import-btn').addEventListener('click', async () => {
  const files = await ipcRenderer.invoke('open-file-dialog')
  if (!files || !files.length) return
  files.forEach(fp => {
    const name = path.basename(fp, path.extname(fp))
    const song = { id: state.nextId++, name, artist: '本地音樂', dur: '0:00', lang: 'mandarin', file: fp }
    SONGS.push(song)
  })
  renderSongs()
  showToast(`已匯入 ${files.length} 首歌曲`)
})

// 視窗按鈕
document.getElementById('btn-min').addEventListener('click', () => ipcRenderer.send('window-minimize'))
document.getElementById('btn-max').addEventListener('click', () => ipcRenderer.send('window-maximize'))
document.getElementById('btn-close').addEventListener('click', () => ipcRenderer.send('window-close'))

// audio 事件同步
audio.addEventListener('timeupdate', () => {
  if (!audio.src) return
  state.progress = Math.floor(audio.currentTime)
  state.duration = Math.floor(audio.duration) || state.duration
  setProgress(state.progress, state.duration)
})
audio.addEventListener('ended', () => {
  clearInterval(state.timer)
  handleSongEnd()
})

// ── 初始化 ───────────────────────────────────────────────────────
renderSongs()
renderQueue()
