from youtube_transcript_api import YouTubeTranscriptApi
import re


def extract_video_id(youtube_url):
    """
    Extract video ID from various YouTube URL formats.
    Supports: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
    """
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    
    return None


def extract_youtube_transcript(youtube_url):
    """
    Extract transcript/captions from YouTube video.
    Returns the combined transcript text.
    """
    
    # Extract video ID
    video_id = extract_video_id(youtube_url)
    if not video_id:
        raise Exception("Could not extract video ID from URL")
    
    try:
        # Create API instance and fetch transcript
        api = YouTubeTranscriptApi()
        
        # Try to get transcript in English first, fallback to any language
        try:
            transcript = api.fetch(video_id, languages=['en'])
        except Exception:
            # Fallback to any available language
            try:
                transcript = api.fetch(video_id)
            except Exception as e:
                raise Exception(f"No captions available for this video: {str(e)}")
        
        if not transcript:
            raise Exception("No transcript data found")
        
        # Combine all transcript entries into single text
        # Each entry is a FetchedTranscriptSnippet with .text property
        full_transcript = " ".join([entry.text for entry in transcript])
        
        return full_transcript
    
    except Exception as e:
        raise Exception(f"Failed to extract transcript: {str(e)}")


def get_video_title(youtube_url):
    """
    Get video title from URL.
    Note: youtube-transcript-api doesn't provide video metadata,
    so we extract title from the video ID.
    """
    video_id = extract_video_id(youtube_url)
    if not video_id:
        return "YouTube Note"
    
    # Return a basic title based on video ID
    return f"YouTube Video ({video_id[:8]})"


def validate_youtube_url(url):
    """
    Validate if the provided URL is a valid YouTube URL.
    """
    youtube_patterns = [
        'youtube.com/watch',
        'youtube.com/playlist',
        'youtu.be/',
        'youtube.com/embed'
    ]
    
    return any(pattern in url for pattern in youtube_patterns)
