import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from database import (
    get_user_profile,
    increment_user_links,
    get_user_accounts,
    add_user_account,
    delete_user_account,
    get_user_defaults,
    save_user_defaults,
    log_post_history,
    upload_file_to_storage,
    submit_contact_message,
    get_media_library,
    add_media_asset,
    delete_media_asset,
    update_media_asset_name,
    get_subscription_plans
)
from generator import GenerateButtonPost
from fb_helper import (
    extract_uid_from_cookie,
    get_access_token_and_act_id,
    get_facebook_profile_name,
    get_facebook_pages
)

app = FastAPI(title="Facebook Link Creator SaaS Backend")

# Setup CORS so Next.js Frontend can communicate with FastAPI Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ContactInput(BaseModel):
    name: str
    email: str
    message: str

class AccountInput(BaseModel):
    user_id: str
    label: str
    cookie_text: str
    access_token: str
    act_id: str
    fb_user_id: Optional[str] = None

class CookieVerifyInput(BaseModel):
    cookie_text: str

class CookieInput(BaseModel):
    user_id: str
    cookie_text: str

class MediaLibraryInput(BaseModel):
    user_id: str
    filename: str
    url: str

class RenameAssetInput(BaseModel):
    filename: str

class DefaultsInput(BaseModel):
    action_button: Optional[str] = "DOWNLOAD"
    message: Optional[str] = ""
    description: Optional[str] = ""
    name: Optional[str] = ""
    caption: Optional[str] = ""
    target_link: Optional[str] = ""
    publish_to_page: Optional[bool] = True
    auto_dimension: Optional[bool] = True

class GenerateRequest(BaseModel):
    user_id: str
    cookie: str
    access_token: str
    page_token: Optional[str] = None
    act_id: str
    page_id: str
    page_name: str
    facebook_account_label: Optional[str] = None
    peek_links: List[str]
    image_links: List[str]
    message: Optional[str] = ""
    description: Optional[str] = ""
    name: Optional[str] = ""
    caption: Optional[str] = ""
    action_button: Optional[str] = "DOWNLOAD"
    publish_to_page: Optional[bool] = True
    auto_dimension: Optional[bool] = True

# Helper dependency to check user limits
def check_user_limits(user_id: str, posts_count: int):
    profile = get_user_profile(user_id)
    account_type = profile.get("account_type", "trial")
    links_limit = profile.get("links_limit", 10)
    links_created = profile.get("links_created", 0)
    daily_created = profile.get("daily_links_created", 0)
    monthly_created = profile.get("monthly_links_created", 0)

    if account_type == "trial":
        if links_created + posts_count > links_limit:
            raise HTTPException(
                status_code=403,
                detail=f"Trial Limit Exceeded! You have created {links_created}/{links_limit} links. Please upgrade your subscription package."
            )
    elif account_type == "plus":
        if daily_created + posts_count > 50:
            raise HTTPException(
                status_code=403,
                detail=f"Daily Limit Exceeded! Plus package allows max 50 links per day. You have used {daily_created}/50 today. Please upgrade to Premium."
            )
        if monthly_created + posts_count > 500:
            raise HTTPException(
                status_code=403,
                detail=f"Monthly Limit Exceeded! Plus package allows max 500 links per month. You have used {monthly_created}/500 this month. Please upgrade to Premium."
            )
    # Premium is unlimited
    return True

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "facebook-link-creator-api"}

@app.get("/api/subscription/plans")
def list_subscription_plans():
    return get_subscription_plans()

@app.get("/api/user/profile/{user_id}")
def user_profile(user_id: str):
    profile = get_user_profile(user_id)
    return profile

@app.get("/api/accounts/{user_id}")
def list_accounts(user_id: str):
    return get_user_accounts(user_id)

@app.post("/api/accounts/add")
def add_account(data: AccountInput):
    acc = add_user_account(
        user_id=data.user_id,
        label=data.label,
        cookie_text=data.cookie_text,
        access_token=data.access_token,
        act_id=data.act_id,
        fb_user_id=data.fb_user_id
    )
    if not acc:
        raise HTTPException(status_code=500, detail="Failed to save account details.")
    return {"success": True, "account": acc}

@app.post("/api/accounts/verify-cookie")
def verify_cookie(data: CookieVerifyInput):
    cookie = data.cookie_text.strip()
    uid = extract_uid_from_cookie(cookie)
    if not uid:
        raise HTTPException(
            status_code=400,
            detail="Invalid cookie string! Could not extract Facebook User ID ('c_user')."
        )
    
    # Auto-fetch name and access token details
    name = get_facebook_profile_name(uid, cookie)
    token, act_id = get_access_token_and_act_id(cookie)
    
    # Try fetching pages to count them
    pages = get_facebook_pages(cookie, token) if token else []
    
    return {
        "success": True, 
        "details": {
            "name": name,
            "uid": uid,
            "token_status": "Active" if token else "Unavailable",
            "access_token": token or "",
            "act_id": act_id or "N/A",
            "pages_count": len(pages),
            "cookie_text": cookie
        }
    }

@app.post("/api/accounts/add-by-cookie")
def add_account_by_cookie(data: CookieInput):
    cookie = data.cookie_text.strip()
    uid = extract_uid_from_cookie(cookie)
    if not uid:
        raise HTTPException(
            status_code=400,
            detail="Invalid cookie string! Could not extract Facebook User ID ('c_user')."
        )
    
    # Auto-fetch name and access token details
    name = get_facebook_profile_name(uid, cookie)
    token, act_id = get_access_token_and_act_id(cookie)
    
    # Save/update account details
    acc = add_user_account(
        user_id=data.user_id,
        label=name,
        cookie_text=cookie,
        access_token=token or "",
        act_id=act_id or "N/A",
        fb_user_id=uid
    )
    if not acc:
        raise HTTPException(status_code=500, detail="Database save failed.")
    return {
        "success": True, 
        "account": acc,
        "details": {
            "name": name,
            "uid": uid,
            "token_status": "Active" if token else "Unavailable",
            "act_id": act_id or "N/A"
        }
    }

@app.delete("/api/accounts/{user_id}/{account_id}")
def remove_account(user_id: str, account_id: int):
    res = delete_user_account(user_id, account_id)
    if not res:
        raise HTTPException(status_code=500, detail="Failed to delete account.")
    return {"success": True}

@app.get("/api/accounts/{user_id}/{account_id}/pages")
def fetch_account_pages(user_id: str, account_id: int):
    accounts = get_user_accounts(user_id)
    acc = next((a for a in accounts if a["id"] == account_id), None)
    if not acc:
        raise HTTPException(status_code=404, detail="Facebook Profile not found.")
    
    pages = get_facebook_pages(acc["cookie_text"], acc["access_token"])
    return pages

@app.get("/api/accounts/{user_id}/{account_id}/check")
def check_account_connection(user_id: str, account_id: int):
    accounts = get_user_accounts(user_id)
    acc = next((a for a in accounts if a["id"] == account_id), None)
    if not acc:
        raise HTTPException(status_code=404, detail="Facebook Profile not found.")
        
    token = acc["access_token"]
    if not token:
        return {"active": False, "reason": "No access token extracted."}
        
    pages = get_facebook_pages(acc["cookie_text"], token)
    if len(pages) > 0 or token.startswith("EAA"):
        return {"active": True, "name": acc["label"], "fb_id": acc["fb_user_id"]}
    else:
        return {"active": False, "reason": "Cookie expired or dead access token."}

# Media Library Endpoints
@app.get("/api/library/{user_id}")
def fetch_media_library(user_id: str):
    return get_media_library(user_id)

@app.post("/api/library/add")
def create_media_asset(data: MediaLibraryInput):
    import requests
    url = data.url.strip()
    filename = data.filename.strip()
    
    # Check if this is an external URL (not already uploaded to Supabase)
    is_external = url.startswith("http") and "supabase.co/storage" not in url
    is_base64 = url.startswith("data:image/")
    
    if is_base64:
        try:
            import re
            import base64
            match = re.match(r"data:image/(\w+);base64,(.+)", url)
            if match:
                img_format = match.group(1)
                base64_data = match.group(2)
                file_bytes = base64.b64decode(base64_data)
                
                ext = f".{img_format}"
                clean_filename = filename if filename else "base64_image"
                if not clean_filename.endswith(ext):
                    clean_filename += ext
                
                content_type = f"image/{img_format}"
                public_url = upload_file_to_storage(file_bytes, clean_filename, content_type)
                if public_url:
                    url = public_url
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to upload decoded base64 image to Supabase Storage."
                    )
            else:
                raise HTTPException(status_code=400, detail="Invalid base64 image format.")
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing base64 image: {str(e)}"
            )
    elif is_external:
        try:
            # Download the image with browser headers to prevent 403 Forbidden
            download_headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            }
            response = requests.get(url, headers=download_headers, timeout=15)
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "image/jpeg")
                # Determine extension
                ext = ".jpg"
                if "png" in content_type:
                    ext = ".png"
                elif "gif" in content_type:
                    ext = ".gif"
                elif "webp" in content_type:
                    ext = ".webp"
                
                # Make a valid clean filename
                clean_filename = filename if filename else "downloaded_image"
                if not clean_filename.endswith(ext):
                    clean_filename += ext
                
                # Upload to storage
                public_url = upload_file_to_storage(response.content, clean_filename, content_type)
                if public_url:
                    url = public_url
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to upload downloaded image to Supabase Storage."
                    )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to download external image: Status code {response.status_code}"
                )
        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error downloading or processing external image: {str(e)}"
            )
            
    asset = add_media_asset(data.user_id, filename, url)
    if not asset:
        raise HTTPException(status_code=500, detail="Failed to save image to library.")
    return {"success": True, "asset": asset}

@app.delete("/api/library/{user_id}/{asset_id}")
def remove_media_asset(user_id: str, asset_id: int):
    res = delete_media_asset(user_id, asset_id)
    if not res:
        raise HTTPException(status_code=500, detail="Failed to delete image asset.")
    return {"success": True}

@app.patch("/api/library/update/{user_id}/{asset_id}")
def update_media_asset(user_id: str, asset_id: int, data: RenameAssetInput):
    filename = data.filename.strip()
    if not filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")
    
    asset = update_media_asset_name(user_id, asset_id, filename)
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found or update failed.")
    return {"success": True, "asset": asset}

@app.get("/api/defaults/{user_id}")
def get_defaults(user_id: str):
    return get_user_defaults(user_id)

@app.post("/api/defaults/save/{user_id}")
def save_defaults(user_id: str, data: DefaultsInput):
    res = save_user_defaults(user_id, data.dict())
    if not res:
        raise HTTPException(status_code=500, detail="Failed to save settings defaults.")
    return {"success": True, "defaults": res}

@app.post("/api/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """Upload uploaded file to Supabase Storage and return public URL."""
    try:
        contents = await file.read()
        public_url = upload_file_to_storage(contents, file.filename, file.content_type)
        if not public_url:
            raise HTTPException(status_code=500, detail="Supabase upload returned empty URL.")
        return {"success": True, "url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@app.post("/api/contact/submit")
def post_contact_submission(data: ContactInput):
    res = submit_contact_message(data.name, data.email, data.message)
    if not res:
        raise HTTPException(status_code=500, detail="Failed to save message. Please try again.")
    return {"success": True, "message": "Message submitted successfully!"}


@app.post("/api/posts/generate")
def generate_posts(req: GenerateRequest):
    # 1. Validate limits before processing
    posts_count = max(len(req.peek_links), len(req.image_links)) if req.image_links else len(req.peek_links)
    check_user_limits(req.user_id, posts_count)
    
    successful_links = []
    failed_links = []
    
    # 2. Iterate and generate links
    for idx in range(posts_count):
        peek = req.peek_links[idx % len(req.peek_links)]
        img = req.image_links[idx % len(req.image_links)] if req.image_links else ''
        
        # Prepare CTA
        cta = {'type': req.action_button}
        if req.action_button == 'LIKE_PAGE':
            cta['value'] = {'page': req.page_id}
            
        details = {
            'cookie': req.cookie,
            'access_token': req.access_token,
            'page_token': req.page_token,
            'act_id': req.act_id,
            'id': req.page_id,
            'peek': peek,
            'image_url': img,
            'message': req.message,
            'description': req.description,
            'name': req.name,
            'caption': req.caption,
            'call_to_action': cta,
            'auto_dimension': req.auto_dimension
        }
        
        # Run creator engine
        engine = GenerateButtonPost(details, publish=req.publish_to_page)
        
        if engine.success:
            successful_links.append({
                "peek": peek,
                "image": img,
                "permalink": engine.permalink,
                "story_id": engine.story_id
            })
            # Log to DB history
            log_post_history(
                user_id=req.user_id,
                page_name=req.page_name,
                peek_link=peek,
                image_url=img,
                permalink=engine.permalink,
                status="success",
                facebook_account_label=req.facebook_account_label
            )
            # Increment usage limit
            increment_user_links(req.user_id, 1)
        else:
            failed_links.append({
                "peek": peek,
                "image": img,
                "reason": engine.error_msg
            })
            log_post_history(
                user_id=req.user_id,
                page_name=req.page_name,
                peek_link=peek,
                image_url=img,
                permalink="N/A",
                status="failed",
                error_message=engine.error_msg,
                facebook_account_label=req.facebook_account_label
            )
            
    return {
        "success": len(successful_links) > 0,
        "results": {
            "successful": successful_links,
            "failed": failed_links
        }
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
