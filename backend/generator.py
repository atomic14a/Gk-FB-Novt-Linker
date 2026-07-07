import re
import os
import json
import time
import requests
from PIL import Image, ImageFilter
import io

# Windows terminal ANSI color support enabling
if os.name == 'nt':
    os.system('')
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass

class C:
    RST = '\x1b[0m'
    BOLD = '\x1b[1m'
    DIM = '\x1b[2m'
    RED = '\x1b[91m'
    GREEN = '\x1b[92m'
    YELLOW = '\x1b[93m'
    BLUE = '\x1b[94m'
    CYAN = '\x1b[96m'
    WHITE = '\x1b[97m'
    GRAY = '\x1b[90m'
    MAGENTA = '\x1b[95m'

def convert_cookies(s=None):
    """Convert raw cookie string to dictionary format."""
    if not s:
        return {}
    
    cookies = {}
    from urllib.parse import unquote
    
    # Strip quotes if present
    s = s.strip('"\'')
    
    for item in s.split(';'):
        if '=' in item:
            k, v = item.split('=', 1)
            cookies[k.strip()] = unquote(v.strip())
            
    return cookies

def get_headers(cookie):
    """Generate default headers with the cookie session context."""
    return {
        'Authority': 'graph.facebook.com',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Cookie': cookie,
        'Origin': 'https://www.facebook.com',
        'Pragma': 'no-cache',
        'Referer': 'https://www.facebook.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

class GenerateButtonPost:
    """Standard CTA Button Post generation engine for Web API environment."""
    def __init__(self, details, publish=True):
        self.details = details
        self.success = False
        self.error_msg = None
        self.story_id = None
        self.post_id = None
        self.permalink = None
        
        print(f"\n{C.CYAN}{C.BOLD}[Backend CLI] Starting link generation...{C.RST}")
        print(f"  {C.BLUE}Target Redirect URL: {self.details.get('peek')}{C.RST}")
        print(f"  {C.BLUE}Facebook Page ID:    {self.details.get('id')}{C.RST}")
        
        # 1. Ad Creative / Post ID generate
        self.post_id = self.gen_post()
        if not self.post_id:
            print(f"  {C.RED}[Backend CLI] Failed at step 1: Ad Creative generation. Error: {self.error_msg}{C.RST}")
            return
            
        # 2. Fetch effective story ID
        self.story_id = self.get_story_id(self.post_id)
        if not self.story_id:
            self.error_msg = "Failed to get effective object story ID."
            print(f"  {C.RED}[Backend CLI] Failed at step 2: Fetch effective story ID.{C.RST}")
            return
            
        print(f"  {C.GREEN}[Backend CLI] Step 2 Success: Effective Story ID = {self.story_id}{C.RST}")

        if publish:
            # 3. Publish/Finalize post
            self.finalize_post(self.story_id)
            
            # 4. Scrape permalink
            if self.success:
                self.scrape_permalink(self.story_id)
                print(f"  {C.GREEN}{C.BOLD}[Backend CLI] Generation Complete! Live URL: {self.permalink}{C.RST}\n")
            else:
                print(f"  {C.RED}[Backend CLI] Failed at step 3: Finalizing and publishing. Error: {self.error_msg}{C.RST}")
        else:
            self.success = True
            if '_' in self.story_id:
                parts = self.story_id.split('_')
                self.permalink = f"https://web.facebook.com/permalink.php?story_fbid={parts[1]}&id={parts[0]}"
            else:
                self.permalink = f"https://web.facebook.com/{self.story_id}"
            print(f"  {C.GREEN}{C.BOLD}[Backend CLI] Generation Complete (Dark Post Mode)! Preview URL: {self.permalink}{C.RST}\n")

    def finalize_post(self, story):
        print(f"  {C.BLUE}[Backend CLI] Step 3: Finalizing and publishing post...{C.RST}")
        headers = get_headers(self.details['cookie'])
        params = {
            'access_token': self.details.get('page_token', self.details.get('access_token')),
            'fewfeedcors': '0' 
        }
        payload = {
            'is_published': 'true'
        }
        
        try:
            r = requests.post(
                f"https://graph.facebook.com/v15.0/{story}", 
                params=params, 
                data=payload, 
                headers=headers,
                timeout=20
            ).json()
            
            if r.get('success'):
                self.success = True
                print(f"  {C.GREEN}[Backend CLI] Step 3 Success: Post published.{C.RST}")
                return None
            self.error_msg = r.get('error', {}).get('message', 'Finalize failed')
            print(f"  {C.RED}[Backend CLI] Step 3 Failed: {self.error_msg}{C.RST}")
        except Exception as e:
            self.error_msg = f"Network error during finalization: {str(e)}"
            print(f"  {C.RED}[Backend CLI] Step 3 Failed: {self.error_msg}{C.RST}")
        return None

    def scrape_permalink(self, story_id):
        url = f"https://web.facebook.com/{story_id}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        try:
            r = requests.get(url, headers=headers, cookies=convert_cookies(self.details['cookie']), allow_redirects=True, timeout=20)
            text = r.text.replace('\\/', '/')
            
            match = re.search(r'"story_fbid"\s*:\s*"([^"]+)"\s*,\s*"id"\s*:\s*"([^"]+)"', text)
            if match:
                self.permalink = f"https://web.facebook.com/permalink.php?story_fbid={match.group(1)}&id={match.group(2)}"
            else:
                alt_match = re.search(r'permalink_url"\s*:\s*"([^"]+)"', text)
                if alt_match:
                    self.permalink = alt_match.group(1)
                else:
                    self.permalink = f"https://web.facebook.com/{story_id}"
        except Exception:
            self.permalink = f"https://web.facebook.com/{story_id}"

    def get_story_id(self, pid):
        print(f"  {C.BLUE}[Backend CLI] Step 2: Fetching effective story ID (polling Facebook API)...{C.RST}")
        params = {
            'access_token': self.details['access_token'],
            'fields': 'effective_object_story_id',
            'fewfeedcors': '0'
        }
        headers = get_headers(self.details['cookie'])
        
        for attempt in range(1, 7):
            print(f"    {C.GRAY}[Backend CLI] polling story ID (attempt {attempt}/6)...{C.RST}")
            time.sleep(4)
            try:
                resp = requests.get(
                    f"https://graph.facebook.com/v15.0/{pid}", 
                    params=params, 
                    headers=headers,
                    cookies=convert_cookies(self.details['cookie']),
                    timeout=20
                ).json()
                
                sid = resp.get('effective_object_story_id')
                if sid:
                    return sid
            except Exception as e:
                print(f"    {C.RED}[Backend CLI] Poll error: {e}{C.RST}")
                pass
        return None

    def gen_post(self):
        print(f"  {C.BLUE}[Backend CLI] Step 1: Preparing post adcreative spec...{C.RST}")
        params = {
            'access_token': self.details['access_token'],
            'fields': 'effective_object_story_id',
            'fewfeedcors': '0'
        }
        
        cta = dict(self.details.get('call_to_action', {'type': 'LEARN_MORE'}))
        if 'value' not in cta:
            cta['value'] = {}
        if 'link' not in cta['value'] and cta['type'] not in ['LIKE_PAGE', 'JOIN_GROUP']:
            cta['value']['link'] = self.details.get('peek', '')

        link_data = {
            'message': self.details.get('message', ''),
            'description': self.details.get('description', ''),
            'link': self.details.get('peek', ''),
            'name': self.details.get('name', ''),
            'multi_share_optimized': True,
            'multi_share_end_card': False,
            'caption': self.details.get('caption', ''),
            'call_to_action': cta
        }
        
        if self.details.get('image_url'):
            img_url = self.details['image_url']
            print(f"    {C.GRAY}[Backend CLI] Fetching banner image from URL: {img_url}{C.RST}")
            try:
                img_resp = requests.get(img_url, timeout=15)
                if img_resp.status_code == 200:
                    try:
                        img = Image.open(io.BytesIO(img_resp.content))
                        width, height = img.size
                        
                        auto_dim = self.details.get('auto_dimension', True)
                        if auto_dim and (width < 600 or height < 315 or abs((width / height) - 1.91) > 0.05):
                            print(f"    {C.YELLOW}[Backend CLI] Image ({width}x{height}) did not match 1.91:1 banner ratio. Applying blurred background padding to 1200x628...{C.RST}")
                            tw, th = 1200, 628
                            target_ratio = tw / th
                            orig_ratio = width / height
                            
                            bg = img.resize((tw, th), Image.Resampling.LANCZOS)
                            bg = bg.filter(ImageFilter.GaussianBlur(20))
                            
                            if orig_ratio > target_ratio:
                                nw = tw
                                nh = int(tw / orig_ratio)
                            else:
                                nh = th
                                nw = int(th * orig_ratio)
                                
                            resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
                            
                            x = (tw - nw) // 2
                            y = (th - nh) // 2
                            bg.paste(resized, (x, y))
                            
                            out_io = io.BytesIO()
                            bg.save(out_io, format='JPEG')
                            img_data = out_io.getvalue()
                        else:
                            print(f"    {C.GRAY}[Backend CLI] Image dimensions ({width}x{height}) are valid.{C.RST}")
                            img_data = img_resp.content
                    except Exception as pe:
                        print(f"    {C.RED}[Backend CLI] Pillow processing failed: {pe}. Fallback to raw bytes.{C.RST}")
                        img_data = img_resp.content

                    print(f"    {C.BLUE}[Backend CLI] Uploading image to Facebook Ads Manager asset library...{C.RST}")
                    import base64
                    image_b64 = base64.b64encode(img_data).decode('ascii')
                    boundary = '----WebKitFormBoundary' + os.urandom(8).hex()
                    body = f"--{boundary}\r\nContent-Disposition: form-data; name=\"bytes\"\r\n\r\n{image_b64}\r\n--{boundary}--\r\n"
                    
                    upload_headers = {
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
                        'Content-Type': f'multipart/form-data; boundary={boundary}',
                        'Accept': 'application/json, text/plain, */*'
                    }
                    
                    upload_params = {
                        'access_token': self.details['access_token'],
                        'method': 'post',
                        '__cppo': '1',
                        'ads_manager_write_regions': 'true',
                        'image_creation_source': 'ADVERTISER_MANUAL_UPLOAD',
                        'accountId': self.details['act_id'],
                        'fewfeedcors': '0'
                    }
                    
                    cookie_dict = convert_cookies(self.details['cookie'])
                    upload_url = f"https://graph.facebook.com/v21.0/act_{self.details['act_id']}/adimages"
                    up_resp = requests.post(
                        upload_url,
                        params=upload_params,
                        data=body.encode('utf-8'),
                        headers=upload_headers,
                        cookies=cookie_dict,
                        timeout=30
                    ).json()
                    
                    if 'images' in up_resp and up_resp['images']:
                        first_key = list(up_resp['images'].keys())[0]
                        img_hash = up_resp['images'][first_key].get('hash')
                        if img_hash:
                            link_data['image_hash'] = img_hash
                            print(f"    {C.GREEN}[Backend CLI] Upload Success! Image Hash = {img_hash}{C.RST}")
                    
                    if 'error' in up_resp:
                        err_msg = up_resp['error'].get('message', 'Unknown upload error')
                        print(f"    {C.RED}[Backend CLI] Image Upload Failed: {err_msg}. Falling back to standard URL.{C.RST}")
                        link_data['picture'] = img_url
                else:
                    print(f"    {C.RED}[Backend CLI] Image URL returned status code {img_resp.status_code}. Falling back to standard URL.{C.RST}")
                    link_data['picture'] = img_url
            except Exception as e:
                print(f"    {C.RED}[Backend CLI] Exception during image upload: {e}. Falling back to standard URL.{C.RST}")
                link_data['picture'] = img_url
                
        payload = {
            'object_story_spec': json.dumps({
                'link_data': link_data,
                'page_id': self.details['id']
            })
        }
        
        headers = get_headers(self.details['cookie'])
        print(f"    {C.BLUE}[Backend CLI] Registering Ad Creative spec...{C.RST}")
        
        try:
            resp = requests.post(
                f"https://graph.facebook.com/v15.0/act_{self.details['act_id']}/adcreatives", 
                params=params, 
                data=payload, 
                headers=headers,
                timeout=20
            )
            create_ad = resp.json()
            
            if create_ad.get('id'):
                print(f"  {C.GREEN}[Backend CLI] Step 1 Success: Created Ad Creative ID = {create_ad['id']}{C.RST}")
                return create_ad['id']
                
            err = create_ad.get('error', {})
            print(f"    {C.RED}[Backend CLI] Facebook API Error Response: {json.dumps(create_ad)}{C.RST}")
            self.error_msg = err.get('error_user_msg') or err.get('message') or 'Unknown error'
        except Exception as e:
            self.error_msg = str(e)
            print(f"    {C.RED}[Backend CLI] Network error: {e}{C.RST}")
            
        return None
