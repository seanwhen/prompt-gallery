import os
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

from backend.routers import items, media

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router, prefix="/api")
app.include_router(media.router, prefix="/api")

client = OpenAI(
    api_key=os.environ.get("MIMO_API_KEY"),
    base_url=os.environ.get("MIMO_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1"),
)

MODEL = os.environ.get("MIMO_MODEL", "mimo-v2.5-pro")

SYSTEM_PROMPT = """You are MiMo, an AI assistant developed by Xiaomi.
You help users craft and refine image/video generation prompts.
You can:
- Generate prompts from user descriptions
- Improve and optimize existing prompts
- Translate prompts between languages
- Suggest style keywords and parameters
- Explain prompt engineering techniques

Respond in the same language as the user's message. Be concise and professional."""


from typing import Union


class ChatMessage(BaseModel):
    role: str
    content: Union[str, list]


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    stream: bool = True


@app.post("/api/chat")
async def chat(request: ChatRequest):
    logger.info(f"[CHAT] Received {len(request.messages)} messages, stream={request.stream}")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in request.messages:
        content = msg.content
        # Log content type
        if isinstance(content, list):
            types = [p.get("type", "?") for p in content]
            logger.info(f"[CHAT] User message has {len(content)} parts: {types}")
            for p in content:
                ptype = p.get("type", "")
                if ptype == "image_url":
                    url = p.get("image_url", {}).get("url", "")
                    logger.info(f"[CHAT] Image: {url[:80]}... (len={len(url)})")
                elif ptype == "video_url":
                    url = p.get("video_url", {}).get("url", "")
                    logger.info(f"[CHAT] Video: {url[:80]}... (len={len(url)})")
                elif ptype == "input_audio":
                    data = p.get("input_audio", {}).get("data", "")
                    logger.info(f"[CHAT] Audio: (len={len(data)})")
        else:
            logger.info(f"[CHAT] User message: {str(content)[:100]}")
        messages.append({"role": msg.role, "content": content})

    if request.stream:
        def generate():
            try:
                logger.info(f"[CHAT] Calling MiMo API with {len(messages)} messages, model={MODEL}")
                stream = client.chat.completions.create(
                    model=MODEL,
                    messages=messages,
                    stream=True,
                    max_completion_tokens=2048,
                    temperature=0.7,
                    top_p=0.9,
                )
                chunk_count = 0
                for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        chunk_count += 1
                        yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"
                logger.info(f"[CHAT] Stream done, sent {chunk_count} chunks")
            except Exception as e:
                err_msg = f"\n\n[错误: {type(e).__name__}: {e}]"
                logger.error(f"[CHAT] Error: {type(e).__name__}: {e}")
                yield f"data: {json.dumps({'content': err_msg})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")
    else:
        try:
            logger.info(f"[CHAT] Calling MiMo API (non-stream), model={MODEL}")
            completion = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                max_completion_tokens=2048,
                temperature=0.7,
                top_p=0.9,
            )
            logger.info(f"[CHAT] Response: {completion.choices[0].message.content[:100]}")
            return {"content": completion.choices[0].message.content}
        except Exception as e:
            logger.error(f"[CHAT] Error: {type(e).__name__}: {e}")
            return {"content": f"错误: {type(e).__name__}: {e}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8923)
