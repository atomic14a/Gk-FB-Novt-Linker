import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env variables relative to this file
dotenv_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Initialize Supabase client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_user_profile(user_id: str):
    """Fetch user profile details (account type, limits, usage) with automatic resets."""
    import datetime
    today_str = str(datetime.date.today())
    today = datetime.date.today()
    
    if not supabase:
        return {
            "account_type": "trial", 
            "links_limit": 10, 
            "links_created": 0, 
            "daily_links_created": 0,
            "monthly_links_created": 0,
            "full_name": ""
        }
        
    try:
        response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if response.data:
            profile = response.data[0]
            
            # Reset counters if date is different
            last_daily = profile.get("last_reset_daily")
            last_monthly = profile.get("last_reset_monthly")
            
            updates = {}
            
            # Reset daily limits
            if not last_daily or str(last_daily) != today_str:
                updates["daily_links_created"] = 0
                updates["last_reset_daily"] = today_str
                profile["daily_links_created"] = 0
                profile["last_reset_daily"] = today_str
                
            # Reset monthly limits
            if last_monthly:
                try:
                    last_monthly_date = datetime.datetime.strptime(str(last_monthly), "%Y-%m-%d").date()
                    if last_monthly_date.year != today.year or last_monthly_date.month != today.month:
                        updates["monthly_links_created"] = 0
                        updates["last_reset_monthly"] = today_str
                        profile["monthly_links_created"] = 0
                        profile["last_reset_monthly"] = today_str
                except Exception as parse_err:
                    print(f"Error parsing last_reset_monthly: {parse_err}")
                    updates["monthly_links_created"] = 0
                    updates["last_reset_monthly"] = today_str
                    profile["monthly_links_created"] = 0
                    profile["last_reset_monthly"] = today_str
            else:
                updates["monthly_links_created"] = 0
                updates["last_reset_monthly"] = today_str
                profile["monthly_links_created"] = 0
                profile["last_reset_monthly"] = today_str
                


            if updates:
                supabase.table("profiles").update(updates).eq("id", user_id).execute()
                
            return profile
        else:
            # Resolve trial link_limit
            try:
                plan_resp = supabase.table("subscription_plans").select("link_limit").eq("id", "trial").execute()
                if plan_resp.data:
                    trial_lim = plan_resp.data[0].get("link_limit", 10)
                else:
                    trial_lim = 10
            except Exception:
                trial_lim = 10

            new_profile = {
                "id": user_id,
                "full_name": "",
                "account_type": "trial",
                "links_limit": trial_lim,
                "links_created": 0,
                "daily_links_created": 0,
                "monthly_links_created": 0,
                "last_reset_daily": today_str,
                "last_reset_monthly": today_str
            }
            supabase.table("profiles").insert(new_profile).execute()
            return new_profile
    except Exception as e:
        print(f"Error fetching profile: {e}")
        return {
            "account_type": "trial", 
            "links_limit": 10, 
            "links_created": 0, 
            "daily_links_created": 0,
            "monthly_links_created": 0,
            "full_name": ""
        }

def increment_user_links(user_id: str, count: int = 1):
    """Increment the usage metrics (total, daily, and monthly) for the user."""
    if not supabase:
        return
    try:
        profile = get_user_profile(user_id)
        new_total = profile.get("links_created", 0) + count
        new_daily = profile.get("daily_links_created", 0) + count
        new_monthly = profile.get("monthly_links_created", 0) + count
        
        supabase.table("profiles").update({
            "links_created": new_total,
            "daily_links_created": new_daily,
            "monthly_links_created": new_monthly
        }).eq("id", user_id).execute()
    except Exception as e:
        print(f"Error incrementing links count: {e}")

def get_user_accounts(user_id: str):
    """Retrieve saved Facebook accounts/cookies for the user."""
    if not supabase:
        return []
    try:
        response = supabase.table("facebook_accounts").select("*").eq("user_id", user_id).execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching Facebook accounts: {e}")
        return []

def add_user_account(user_id: str, label: str, cookie_text: str, access_token: str, act_id: str, fb_user_id: str = None):
    """Save or update a Facebook account/cookie configuration for the user."""
    if not supabase:
        return None
    try:
        # Check if already exists for this user by fb_user_id to prevent duplicates
        if fb_user_id:
            existing = supabase.table("facebook_accounts").select("*").eq("user_id", user_id).eq("fb_user_id", fb_user_id).execute()
            if existing.data:
                acc_id = existing.data[0]["id"]
                update_data = {
                    "label": label,
                    "cookie_text": cookie_text,
                    "access_token": access_token,
                    "act_id": act_id
                }
                resp = supabase.table("facebook_accounts").update(update_data).eq("id", acc_id).execute()
                return resp.data[0] if resp.data else None

        new_acc = {
            "user_id": user_id,
            "label": label,
            "cookie_text": cookie_text,
            "access_token": access_token,
            "act_id": act_id,
            "fb_user_id": fb_user_id
        }
        response = supabase.table("facebook_accounts").insert(new_acc).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error adding Facebook account: {e}")
        return None

def delete_user_account(user_id: str, account_id: int) -> bool:
    """Delete a saved Facebook account/cookie configuration."""
    if not supabase:
        return False
    try:
        supabase.table("facebook_accounts").delete().eq("user_id", user_id).eq("id", account_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting Facebook account: {e}")
        return False


def get_user_defaults(user_id: str):
    """Fetch user's default settings configuration."""
    if not supabase:
        return {}
    try:
        response = supabase.table("user_defaults").select("*").eq("user_id", user_id).execute()
        if response.data:
            return response.data[0]
        return {}
    except Exception as e:
        print(f"Error fetching defaults: {e}")
        return {}

def save_user_defaults(user_id: str, defaults: dict):
    """Save/update user's default settings configuration."""
    if not supabase:
        return None
    try:
        defaults["user_id"] = user_id
        # Upsert defaults settings
        response = supabase.table("user_defaults").upsert(defaults).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error saving defaults: {e}")
        return None

def log_post_history(user_id: str, page_name: str, peek_link: str, image_url: str, permalink: str, status: str, error_message: str = None, facebook_account_label: str = None):
    """Log a generated post execution result in history."""
    if not supabase:
        return
    try:
        log_entry = {
            "user_id": user_id,
            "page_name": page_name,
            "peek_link": peek_link,
            "image_url": image_url,
            "permalink": permalink,
            "status": status,
            "error_message": error_message,
            "facebook_account_label": facebook_account_label
        }
        supabase.table("posts_history").insert(log_entry).execute()
    except Exception as e:
        print(f"Error logging post history: {e}")

def upload_file_to_storage(file_bytes: bytes, filename: str, content_type: str = None) -> str:
    """Upload a raw image file to the Supabase Storage 'images' bucket and return its public URL."""
    if not supabase:
        return ""
    
    bucket_name = "images"
    import time
    unique_filename = f"{int(time.time())}_{filename}"
    
    if not content_type:
        import mimetypes
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            content_type = "image/jpeg"
            
    # Try uploading
    try:
        supabase.storage.from_(bucket_name).upload(
            path=unique_filename,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
    except Exception as e:
        err_msg = str(e)
        if "Bucket not found" in err_msg or "404" in err_msg:
            try:
                # Attempt to create the bucket
                print(f"Bucket '{bucket_name}' not found. Attempting to create it...")
                supabase.storage.create_bucket(bucket_name, options={"public": True})
                # Retry upload
                supabase.storage.from_(bucket_name).upload(
                    path=unique_filename,
                    file=file_bytes,
                    file_options={"content-type": content_type}
                )
            except Exception as retry_err:
                print(f"Failed to create bucket or upload on retry: {retry_err}")
                return ""
        else:
            print(f"Error uploading file to storage: {e}")
            return ""
            
    # Get public url
    try:
        url_resp = supabase.storage.from_(bucket_name).get_public_url(unique_filename)
        return url_resp
    except Exception as e:
        print(f"Error getting public URL: {e}")
        return ""

def submit_contact_message(name: str, email: str, message: str) -> bool:
    """Insert a contact form submission into the contact_submissions table."""
    if not supabase:
        return False
    try:
        data = {
            "name": name,
            "email": email,
            "message": message
        }
        supabase.table("contact_submissions").insert(data).execute()
        return True
    except Exception as e:
        print(f"Error submitting contact message: {e}")
        return False

def get_media_library(user_id: str):
    """Retrieve saved media gallery assets for the user."""
    if not supabase:
        return []
    try:
        response = supabase.table("media_library").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching media library: {e}")
        return []

def add_media_asset(user_id: str, filename: str, url: str):
    """Add a new image asset to the media library."""
    if not supabase:
        return None
    try:
        new_asset = {
            "user_id": user_id,
            "filename": filename,
            "url": url
        }
        response = supabase.table("media_library").insert(new_asset).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error adding media asset: {e}")
        return None

def delete_media_asset(user_id: str, asset_id: int) -> bool:
    """Remove an asset from the media library."""
    if not supabase:
        return False
    try:
        supabase.table("media_library").delete().eq("user_id", user_id).eq("id", asset_id).execute()
        return True
    except Exception as e:
        print(f"Error deleting media asset: {e}")
        return False

def update_media_asset_name(user_id: str, asset_id: int, new_filename: str):
    """Update filename for an asset in the media library."""
    if not supabase:
        return None
    try:
        response = supabase.table("media_library").update({"filename": new_filename}).eq("user_id", user_id).eq("id", asset_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error updating media asset name: {e}")
        return None

def get_subscription_plans():
    """Retrieve all subscription plans from the database with standard fallbacks."""
    if not supabase:
        return get_default_plans()
    try:
        response = supabase.table("subscription_plans").select("*").execute()
        if response.data:
            # Sort them to keep order: trial first, then plus, then premium
            order = {'trial': 0, 'plus': 1, 'premium': 2}
            return sorted(response.data, key=lambda x: order.get(x['id'], 9))
        return get_default_plans()
    except Exception as e:
        print(f"Error fetching subscription plans: {e}")
        return get_default_plans()

def get_default_plans():
    return [
        {
          "id": "trial",
          "name": "Trial Package",
          "price": "$0",
          "period": "lifetime",
          "description": "Ideal for beginners testing out campaign structures.",
          "limits": "10 Total Links",
          "link_limit": 10,
          "features": [
            "Up to 10 customized redirection links",
            "Basic Facebook Creative preview tools",
            "Custom CTA link buttons support",
            "Standard media library file uploads"
          ],
          "badge": "Starter",
          "badge_bg": "rgba(255, 255, 255, 0.05)",
          "badge_color": "var(--text-muted)"
        },
        {
          "id": "plus",
          "name": "Plus Package",
          "price": "$15",
          "period": "per month",
          "description": "Perfect for active marketers scaling daily creative assets.",
          "limits": "50 Daily / 500 Monthly Links",
          "link_limit": 500,
          "features": [
            "Max 50 new links daily limit",
            "Max 500 links monthly limit",
            "Dynamic mockup settings presets",
            "Unlimited media library storage capacity",
            "Priority banner resizing & blurring tools"
          ],
          "badge": "Most Popular",
          "badge_bg": "rgba(99, 102, 241, 0.15)",
          "badge_color": "var(--primary)"
        },
        {
          "id": "premium",
          "name": "Premium Package",
          "price": "$30",
          "period": "per month",
          "description": "For agencies and power users requiring absolute scale.",
          "limits": "Unlimited Links",
          "link_limit": 999999,
          "features": [
            "Unlimited daily link creations",
            "Unlimited monthly link creations",
            "Priority ad creative processing speed",
            "Full mockup click-to-focus interactive page access",
            "24/7 client support assistance"
          ],
          "badge": "Unrestricted",
          "badge_bg": "rgba(16, 185, 129, 0.15)",
          "badge_color": "var(--success)"
        }
    ]


