import re
import requests

def convert_cookies(cookie_str: str) -> dict:
    """Parse a raw cookie string into a dictionary."""
    cookies = {}
    if not cookie_str:
        return cookies
    pairs = cookie_str.split(';')
    for pair in pairs:
        pair = pair.strip()
        if not pair or '=' not in pair:
            continue
        try:
            parts = pair.split('=', 1)
            key = parts[0].strip()
            val = parts[1].strip()
            cookies[key] = val
        except Exception:
            pass
    return cookies

def extract_uid_from_cookie(cookie_str: str) -> str:
    """Extract c_user value from cookie string."""
    cookies = convert_cookies(cookie_str)
    return cookies.get('c_user', '')

def get_headers(cookie: str) -> dict:
    return {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Not)A;Brand";v="24", "Chromium";v="116"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'Cookie': str(cookie)
    }

def get_access_token_and_act_id(cookie: str):
    """
    Extract EAAB access token and act_id from Facebook Ads Manager/Business Suite.
    Returns tuple: (access_token, act_id)
    """
    if not cookie:
        return None, None
        
    cookies = convert_cookies(cookie)
    if 'c_user' not in cookies:
        return None, None
        
    session = requests.Session()
    session.cookies.update(cookies)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
    }
    session.headers.update(headers)
    
    act_id = None
    access_token = None
    
    # Method 1: Ads Manager
    try:
        r = session.get('https://adsmanager.facebook.com/adsmanager/manage/campaigns?killagent=0', timeout=15, allow_redirects=True)
        if 'login' not in r.url.lower():
            act_match = re.search(r'act=([^&"]+)', r.text)
            if act_match:
                act_id = act_match.group(1)
                token_url = f'https://adsmanager.facebook.com/adsmanager/manage/campaigns?act={act_id}&breakdown_regrouping=1&killagent=0'
                r2 = session.get(token_url, timeout=15)
                eaab = re.search(r'\bEAA\w{20,}', r2.text)
                if eaab:
                    access_token = eaab.group(0)
                    return access_token, act_id
    except Exception as e:
        print(f"Error checking Ads Manager: {e}")

    # Method 2: Business Suite
    try:
        r = session.get('https://business.facebook.com/content_management', timeout=15, allow_redirects=True)
        if 'login' not in r.url.lower():
            eaab = re.search(r'\bEAA\w{20,}', r.text)
            if eaab:
                access_token = eaab.group(0)
                return access_token, None
    except Exception as e:
        print(f"Error checking Business Suite: {e}")
        
    return access_token, act_id

def get_facebook_profile_name(uid: str, cookie: str) -> str:
    """Scrape user's Facebook profile name."""
    name = f"Account_{uid}"
    try:
        r = requests.get(
            f'https://mbasic.facebook.com/profile.php?id={uid}',
            headers={
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html',
                'Cookie': cookie
            },
            timeout=10,
            allow_redirects=True
        )
        title_m = re.search(r'<title>(.*?)</title>', r.text)
        if title_m:
            t = title_m.group(1).strip()
            if t and 'Log In' not in t and 'Error' not in t and 'Facebook' != t:
                return t
    except Exception:
        pass
        
    try:
        r2 = requests.get(
            f'https://graph.facebook.com/v15.0/{uid}',
            headers={
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B)',
                'Cookie': cookie
            },
            timeout=10
        )
        data = r2.json()
        if 'name' in data:
            return data['name']
    except Exception:
        pass
        
    return name

def get_facebook_pages(cookie: str, access_token: str) -> list:
    """Fetch Facebook pages accessible with this access token and cookie."""
    if not access_token:
        return []
    try:
        r = requests.get(
            "https://graph.facebook.com/v15.0/me/accounts",
            params={'access_token': access_token, 'limit': '100'},
            headers=get_headers(cookie),
            timeout=15
        ).json()
        
        if 'error' in r:
            print(f"Facebook API page fetch error: {r['error']}")
            return []
            
        pages = []
        for p in r.get('data', []):
            pages.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "access_token": p.get("access_token")
            })
        return pages
    except Exception as e:
        print(f"Error communicating with Facebook API: {e}")
        return []
