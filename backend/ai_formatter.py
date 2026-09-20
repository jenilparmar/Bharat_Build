from openai import AzureOpenAI
from dotenv import load_dotenv
import os
load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("OPEN_AI_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=os.getenv("OPEN_AI_ENDPOINT")
)

def format_notes(user_text):

    prompt = f"""
    Convert the following messy student notes into structured study notes.
    Rules:
    1. Keep abbreviations exactly as written unless the full form is clearly known.
    2. If the subject full form is clearly known then write it in brackets next to the abbreviation. For example, if the note says "CS (Computer Science)", keep it as is. But if it just says "CS" and it's not clear what it stands for, keep it as "CS".

    Return format:
    Subject:
    Title:
    Explanation:
    Key Points:

    Notes:
    {user_text}
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an AI that organizes student notes."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content