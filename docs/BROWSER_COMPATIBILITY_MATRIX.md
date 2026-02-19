# Browser Compatibility Matrix - Tết Connect

## Supported Browsers & Devices

### Desktop Browsers

| Browser | Version | Support Level | Notes |
|---------|---------|---------------|-------|
| Chrome | Latest (120+) | ✅ Full Support | Primary development browser |
| Safari | Latest (17+) | ✅ Full Support | Test date pickers, file uploads |
| Firefox | Latest (120+) | ✅ Full Support | Test scrollbar styles |
| Edge | Latest (120+) | ✅ Full Support | Chromium-based, similar to Chrome |
| Opera | Latest | ⚠️ Best Effort | Not officially tested |

### Mobile Browsers

| Platform | Browser | Version | Support Level | Notes |
|----------|---------|---------|---------------|-------|
| iOS | Safari | iOS 15+ | ✅ Full Support | Test safe area, camera access |
| Android | Chrome | Android 10+ | ✅ Full Support | Test back button, camera |
| iOS | Chrome | iOS 15+ | ⚠️ Best Effort | Uses Safari engine |
| Android | Firefox | Android 10+ | ⚠️ Best Effort | Not officially tested |

---

## Feature Compatibility

### Core Features

| Feature | Chrome | Safari | Firefox | iOS Safari | Android Chrome |
|---------|--------|--------|---------|------------|----------------|
| Google OAuth | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polling Updates | ✅ | ✅ | ✅ | ✅ | ✅ |
| File Upload | ✅ | ✅ | ✅ | ✅ | ✅ |
| Camera Access | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clipboard API | ✅ | ✅ | ✅ | ✅ | ✅ |
| Local Storage | ✅ | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ | ✅ |

### Advanced Features

| Feature | Chrome | Safari | Firefox | iOS Safari | Android Chrome |
|---------|--------|--------|---------|------------|----------------|
| MediaRecorder API | ✅ | ⚠️ Limited | ✅ | ❌ No | ⚠️ Limited |
| Canvas API | ✅ | ✅ | ✅ | ✅ | ✅ |
| WebSocket | ✅ | ✅ | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ⚠️ Limited | ✅ | ❌ No | ✅ |

**Legend:**
- ✅ Full Support
- ⚠️ Partial/Limited Support
- ❌ Not Supported

---

## CSS Features

### Layout

| Feature | Chrome | Safari | Firefox | iOS Safari | Android Chrome |
|---------|--------|--------|---------|------------|----------------|
| Flexbox | ✅ | ✅ | ✅ | ✅ | ✅ |
| Grid | ✅ | ✅ | ✅ | ✅ | ✅ |
| Container Queries | ✅ | ✅ | ✅ | ✅ | ✅ |
| Aspect Ratio | ✅ | ✅ | ✅ | ✅ | ✅ |

### Visual Effects

| Feature | Chrome | Safari | Firefox | iOS Safari | Android Chrome |
|---------|--------|--------|---------|------------|----------------|
| CSS Transitions | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSS Animations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Backdrop Filter | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSS Variables | ✅ | ✅ | ✅ | ✅ | ✅ |

### Responsive

| Feature | Chrome | Safari | Firefox | iOS Safari | Android Chrome |
|---------|--------|--------|---------|------------|----------------|
| Media Queries | ✅ | ✅ | ✅ | ✅ | ✅ |
| Viewport Units | ✅ | ✅ | ✅ | ✅ | ✅ |
| Touch Events | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pointer Events | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## JavaScript Features

### ES2020+ Features

| Feature | Chrome | Safari | Firefox | iOS Safari | Android Chrome |
|---------|--------|--------|---------|------------|----------------|
| Optional Chaining | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nullish Coalescing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dynamic Import | ✅ | ✅ | ✅ | ✅ | ✅ |
| BigInt | ✅ | ✅ | ✅ | ✅ | ✅ |
| Promise.allSettled | ✅ | ✅ | ✅ | ✅ | ✅ |

### Web APIs

| Feature | Chrome | Safari | Firefox | iOS Safari | Android Chrome |
|---------|--------|--------|---------|------------|----------------|
| Fetch API | ✅ | ✅ | ✅ | ✅ | ✅ |
| IntersectionObserver | ✅ | ✅ | ✅ | ✅ | ✅ |
| ResizeObserver | ✅ | ✅ | ✅ | ✅ | ✅ |
| Web Workers | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Known Issues & Workarounds

### Safari-Specific Issues

#### Issue 1: Date Input Format
**Problem:** Safari date picker format khác với Chrome  
**Workaround:** Sử dụng custom date picker hoặc format validation

```typescript
// Normalize date format
const normalizeDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}
```

#### Issue 2: Flexbox Gap Support
**Problem:** Safari cũ không support `gap` trong flexbox  
**Workaround:** Sử dụng margin fallback

```css
.flex-container {
  display: flex;
  gap: 1rem; /* Modern browsers */
}

.flex-container > * + * {
  margin-left: 1rem; /* Safari fallback */
}
```

#### Issue 3: MediaRecorder Limited Support
**Problem:** Safari không support tất cả codecs  
**Workaround:** Detect và fallback

```typescript
const isMediaRecorderSupported = () => {
  return typeof MediaRecorder !== 'undefined' && 
         MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
}

if (!isMediaRecorderSupported()) {
  // Show error: "Trình duyệt không hỗ trợ tạo video"
  // Suggest using Chrome/Edge
}
```

---

### iOS-Specific Issues

#### Issue 1: 100vh Issue
**Problem:** 100vh không tính đúng với address bar  
**Workaround:** Sử dụng CSS custom property

```typescript
// Set actual viewport height
const setVH = () => {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

window.addEventListener('resize', setVH)
setVH()
```

```css
.full-height {
  height: 100vh; /* Fallback */
  height: calc(var(--vh, 1vh) * 100); /* iOS fix */
}
```

#### Issue 2: Touch Delay
**Problem:** 300ms delay trên touch events  
**Workaround:** Đã fix bằng viewport meta tag

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```

#### Issue 3: Camera Permission
**Problem:** Camera chỉ hoạt động trên HTTPS  
**Workaround:** Đảm bảo app chạy trên HTTPS

---

### Firefox-Specific Issues

#### Issue 1: Scrollbar Styling
**Problem:** Firefox không support `::-webkit-scrollbar`  
**Workaround:** Sử dụng `scrollbar-width` và `scrollbar-color`

```css
/* Chrome/Safari */
::-webkit-scrollbar {
  width: 8px;
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #888 #f1f1f1;
}
```

---

### Android-Specific Issues

#### Issue 1: Back Button Behavior
**Problem:** Back button có thể close app thay vì navigate  
**Workaround:** Handle history API

```typescript
// Prevent back button from closing app
window.history.pushState(null, '', window.location.href)
window.addEventListener('popstate', () => {
  window.history.pushState(null, '', window.location.href)
})
```

#### Issue 2: Keyboard Covering Input
**Problem:** Keyboard che input fields  
**Workaround:** Scroll input vào view

```typescript
const handleFocus = (e: FocusEvent) => {
  setTimeout(() => {
    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 300)
}
```

---

## Testing Tools

### Browser Testing

#### BrowserStack
- Test trên real devices
- URL: https://www.browserstack.com
- Free tier: 100 minutes/month

#### LambdaTest
- Cross-browser testing
- URL: https://www.lambdatest.com
- Free tier: 100 minutes/month

### Mobile Testing

#### Chrome DevTools Device Emulation
```
1. Open DevTools (F12)
2. Click device icon (Ctrl+Shift+M)
3. Select device from dropdown
4. Test responsive behavior
```

#### Safari Responsive Design Mode
```
1. Open Safari
2. Develop > Enter Responsive Design Mode
3. Select device
4. Test iOS-specific issues
```

### Performance Testing

#### Lighthouse (Chrome DevTools)
```
1. Open DevTools
2. Lighthouse tab
3. Select categories
4. Generate report
```

#### WebPageTest
- URL: https://www.webpagetest.org
- Test from different locations
- Detailed performance metrics

---

## Testing Checklist by Browser

### Chrome Desktop
- [ ] Login flow
- [ ] Create family
- [ ] AI content generation
- [ ] Post & reactions
- [ ] Realtime updates
- [ ] Events & tasks
- [ ] Photo upload
- [ ] Video creation
- [ ] Performance (Lighthouse >80)

### Safari Desktop
- [ ] All Chrome tests
- [ ] Date picker functionality
- [ ] File upload (especially HEIC)
- [ ] Flexbox layouts
- [ ] Scrollbar appearance

### Firefox Desktop
- [ ] All Chrome tests
- [ ] Scrollbar styling
- [ ] CSS Grid layouts
- [ ] WebSocket connections

### iOS Safari
- [ ] All mobile features
- [ ] Camera access
- [ ] Touch gestures (swipe, pinch)
- [ ] Safe area handling
- [ ] 100vh issue
- [ ] Keyboard behavior

### Android Chrome
- [ ] All mobile features
- [ ] Camera access
- [ ] Touch gestures
- [ ] Back button behavior
- [ ] Keyboard covering inputs

---

## Minimum Requirements

### Desktop
- **Screen Resolution:** 1024x768 minimum
- **RAM:** 4GB minimum
- **Internet:** 3 Mbps minimum

### Mobile
- **iOS:** 15.0+
- **Android:** 10.0+
- **Screen Size:** 320px width minimum
- **RAM:** 2GB minimum
- **Internet:** 3G minimum

---

## Polyfills & Fallbacks

### Required Polyfills
```json
{
  "browserslist": [
    ">0.2%",
    "not dead",
    "not op_mini all",
    "iOS >= 15",
    "Android >= 10"
  ]
}
```

### Feature Detection
```typescript
// Check feature support
const checkSupport = () => {
  return {
    webp: document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0,
    webSocket: 'WebSocket' in window,
    serviceWorker: 'serviceWorker' in navigator,
    mediaRecorder: 'MediaRecorder' in window,
    clipboard: 'clipboard' in navigator
  }
}
```

---

## Reporting Issues

### Bug Report Format
```markdown
**Browser:** Chrome 120 / Safari 17 / Firefox 120 / iOS 16 / Android 12
**Device:** Desktop / iPhone 14 / Samsung Galaxy S21
**OS:** Windows 11 / macOS 14 / iOS 16 / Android 12
**Screen Size:** 1920x1080 / 390x844

**Issue:**
[Describe the issue]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected:**
[What should happen]

**Actual:**
[What actually happens]

**Screenshots:**
[Attach screenshots]

**Console Errors:**
[Paste console errors if any]
```

---

## Sign-Off

### Browser Compatibility Verified By:

**Chrome Desktop:**
- Tester: ___________
- Date: ___________
- Status: ✅ Pass / ❌ Fail

**Safari Desktop:**
- Tester: ___________
- Date: ___________
- Status: ✅ Pass / ❌ Fail

**Firefox Desktop:**
- Tester: ___________
- Date: ___________
- Status: ✅ Pass / ❌ Fail

**iOS Safari:**
- Tester: ___________
- Date: ___________
- Status: ✅ Pass / ❌ Fail

**Android Chrome:**
- Tester: ___________
- Date: ___________
- Status: ✅ Pass / ❌ Fail
