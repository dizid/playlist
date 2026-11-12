import { describe, it, expect } from 'vitest'
import { detectInAppBrowser, chromeIntentUrl } from '../in-app-browser'

describe('detectInAppBrowser', () => {
  it('names LinkedIn, Facebook and Instagram webviews', () => {
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30')).toEqual({ appName: 'LinkedIn', platform: 'ios' })
    expect(detectInAppBrowser('Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0]')).toEqual({ appName: 'Facebook', platform: 'android' })
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Instagram 350.0')).toEqual({ appName: 'Instagram', platform: 'ios' })
  })

  it('leaves real browsers and home-screen apps alone', () => {
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1')).toBeNull()
    expect(detectInAppBrowser('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36')).toBeNull()
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148', true)).toBeNull()
  })

  it('builds a Chrome intent link on Android only', () => {
    expect(chromeIntentUrl('https://tunecraft.music/?ref=x', 'android')).toBe('intent://tunecraft.music/?ref=x#Intent;scheme=https;package=com.android.chrome;end')
    expect(chromeIntentUrl('https://tunecraft.music/', 'ios')).toBeNull()
  })
})
