from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableBranch, RunnableLambda
from langchain_core.messages import HumanMessage, AIMessage
from pinecone import Pinecone
from typing import Optional
import os
import logging
import httpx
import asyncio
import json
from dotenv import load_dotenv

# Load env vars from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

# Configure logging
logging.basicConfig(level=logging.INFO)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Railway deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG components with Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "brokepacker-articles")

# Use text-embedding-3-large to match Pinecone index (3072 dimensions)
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

# Initialize Pinecone vector store
vectorstore = None
retriever = None

if PINECONE_API_KEY:
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(PINECONE_INDEX)

        # Check if index has vectors
        stats = index.describe_index_stats()
        total_vectors = stats.get("total_vector_count", 0)

        if total_vectors > 0:
            vectorstore = PineconeVectorStore(
                index=index,
                embedding=embeddings,
                text_key="text"
            )
            retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
            logging.info(f"Pinecone initialized with {total_vectors} vectors in index '{PINECONE_INDEX}'")
        else:
            logging.warning(f"Pinecone index '{PINECONE_INDEX}' is empty. RAG will work once vectors are uploaded.")
            # Still create the vectorstore for future use
            vectorstore = PineconeVectorStore(
                index=index,
                embedding=embeddings,
                text_key="text"
            )
            retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    except Exception as e:
        logging.error(f"Failed to initialize Pinecone: {e}")
        vectorstore = None
        retriever = None
else:
    logging.warning("PINECONE_API_KEY not set. Vector search disabled.")

# LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

# Perplexity API for web search
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")


async def search_perplexity(query: str, destination: str) -> str:
    """Query Perplexity API for current travel information."""
    if not PERPLEXITY_API_KEY:
        logging.warning("Perplexity API key not found, skipping web search")
        return ""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.perplexity.ai/chat/completions",
                headers={
                    "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "sonar",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a travel research assistant. Provide current, factual travel information. Focus on: current prices, visa requirements, recent travel advisories, and practical tips. Be concise."
                        },
                        {
                            "role": "user",
                            "content": f"For backpacker travel to {destination}: {query}"
                        }
                    ],
                    "max_tokens": 500,
                    "temperature": 0.2,
                    "search_recency_filter": "month"
                }
            )

            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                logging.info(f"[Perplexity] Got response for: {query[:50]}...")
                return content
            else:
                logging.error(f"[Perplexity] API error: {response.status_code}")
                return ""
    except Exception as e:
        logging.error(f"[Perplexity] Request failed: {e}")
        return ""


# Base Persona Prompt - Enhanced with all context fields
BASE_SYSTEM_TEMPLATE = """You are Sierra, a seasoned adventure traveler at The Broke Backpacker.
You are an adventurous, raw, and honest traveler who has been on the road for over a decade.
You hate tourist traps and love getting off the beaten path.
You speak in a friendly, casual tone - like chatting with a well-traveled friend. Keep it natural and relaxed, but avoid overusing slang or catchphrases.
You are NOT a robot. You are a seasoned backpacker helping someone plan their trip.

IMPORTANT: Do NOT use emojis in your responses. Keep your text clean and professional.

TRIP CONTEXT:
Destination: {destination}
Budget Style: {budget}
{user_profile_section}
{trip_context_section}
{conversation_variables_section}
CONTEXT FROM THE BROKE BACKPACKER (your primary source):
{context}

CURRENT WEB INFO (from recent searches - use for up-to-date prices, visa rules, etc.):
{web_context}

INSTRUCTIONS:
1. Answer the user's question using the provided CONTEXT from The Broke Backpacker articles.
2. If the context contains specific recommendations (hostels, gear, tours), YOU MUST mention them.
3. IMPORTANT: If the context contains an affiliate link for a recommendation (format: [Link Text](URL)), you MUST include it in your response exactly as is. Do not generate generic links.
4. If you don't know the answer based on the context, say so honestly, but offer some general backpacking wisdom.
5. Keep it punchy and engaging.
6. PERSONALIZATION IS KEY - If a user profile is provided:
   - Use their name naturally in conversation
   - Reference places they've been when relevant ("Since you've been to Thailand, you'll find...")
   - Respect their restrictions and deal breakers absolutely
   - Tailor recommendations to their activity preferences and travel style
   - Consider their risk tolerance, comfort level, and budget constraints
   - If they have female traveler concerns, proactively mention safety tips
   - If they're into content creation, suggest photogenic spots and timing
7. If trip context is provided:
   - Consider their specific itinerary stops when giving advice
   - Respect their transportation and accommodation preferences
   - Keep their trip goals in mind (surfing, nightlife, culture, etc.)
   - Honor any deal breakers they've specified
8. BUDGET CALCULATIONS - When providing budget breakdowns:
   - ALWAYS use the full trip duration (check "Duration: X days" in TRIP CONTEXT)
   - Calculate ALL recurring costs (food, transport) for the ENTIRE trip, not just per month
   - Example: 90-day trip with $10/day food = $10 x 90 = $900, NOT $10 x 30 = $300
   - Show the grand total that covers the FULL trip duration
   - Double-check your math before presenting totals
"""


# ============================================
# PYDANTIC MODELS - Feature Set A (User Profile)
# ============================================

class ActivityWeighting(BaseModel):
    party: int = 20
    nature: int = 30
    culture: int = 25
    adventure: int = 15
    relaxation: int = 10


class UserProfile(BaseModel):
    # Basic Info
    name: str
    country_of_origin: str = ""
    passport_country: str = ""

    # Original fields
    travel_style: str = "solo"
    budget_preference: str = "broke-backpacker"
    countries_visited: list[str] = []
    bucket_list: list[str] = []
    interests: list[str] = []
    restrictions: list[str] = []

    # Travel Style Indicators
    risk_tolerance: str = "medium"  # low, medium, high
    comfort_threshold: str = "hostels"  # hostels, tents, hammocks, van, couchsurfing
    hygiene_threshold: str = "every_3_days"  # daily, every_3_days, broke_backpacker_mode
    activity_weighting: Optional[ActivityWeighting] = None
    food_preference: str = "street_food"  # street_food, restaurants, cooking, mixed
    travel_pace: str = "moderate"  # slow, moderate, fast
    electronics_tolerance: str = "medium"  # low, medium, high

    # Backpack Weight
    pack_weight: str = "moderate"  # minimalist, moderate, maximalist

    # Income Type
    income_type: str = "savings_only"  # remote_worker, seasonal_worker, savings_only, passive_income
    monthly_budget: int = 1500

    # Safety Profile
    walk_at_night: bool = True
    experienced_motos: bool = False
    open_to_couchsurfing: bool = False
    female_traveler_concerns: bool = False

    # Content Creation Goals
    instagram_friendly: bool = False
    hidden_spots: bool = True
    video_focus: bool = False
    sunrise_sunset_optimization: bool = False


# ============================================
# PYDANTIC MODELS - Feature Set B (Trip Context)
# ============================================

class ItineraryStop(BaseModel):
    location: str
    days: int
    notes: str = ""


class TripContext(BaseModel):
    # Trip Logistics
    itinerary_breakdown: list[ItineraryStop] = []
    transportation_styles: list[str] = ["mixed"]  # bus, moto, hitchhike, flights, train
    accommodation_styles: list[str] = ["hostel_dorm"]  # hostel_dorm, hostel_private, apartment, tent, van, guesthouse, couchsurfing
    daily_budget_target: int = 50
    trip_duration_days: int = 14
    start_date: Optional[str] = None
    deal_breakers: list[str] = []
    preferred_language: str = "English"  # Language for responses

    # Trip Goals
    trip_goals: list[str] = []  # surf_progression, volunteering, trekking_altitude, etc.
    custom_goals: list[str] = []

    # Safety Overrides
    walk_at_night_override: Optional[bool] = None
    experienced_motos_override: Optional[bool] = None
    open_to_couchsurfing_override: Optional[bool] = None

    # Content Overrides
    instagram_friendly_override: Optional[bool] = None
    hidden_spots_override: Optional[bool] = None
    video_focus_override: Optional[bool] = None

    # Visa Info
    needs_visa: bool = False
    visa_on_arrival: bool = False
    visa_notes: str = ""


class ConversationVarsInput(BaseModel):
    """Conversation variables extracted from previous messages."""
    places_discussed: list[str] = []
    places_to_avoid: list[str] = []
    activity_preferences: list[str] = []
    food_preferences: list[str] = []
    accommodation_notes: list[str] = []
    travel_companions: str = ""
    pace_preference: str = ""
    must_do_activities: list[str] = []
    concerns: list[str] = []
    budget_notes: list[str] = []
    custom_notes: dict[str, str] = {}


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    destination: str = "General"
    budget: str = "Backpacker"
    user_profile: Optional[UserProfile] = None
    trip_context: Optional[TripContext] = None
    conversation_variables: Optional[ConversationVarsInput] = None


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


def build_profile_section(profile: Optional[UserProfile]) -> str:
    """Build a comprehensive profile section for the AI prompt."""
    if not profile:
        return ""

    sections = ["\n" + "="*50, "USER PROFILE", "="*50]

    # Basic Info
    sections.append(f"Name: {profile.name}")
    if profile.country_of_origin:
        sections.append(f"From: {profile.country_of_origin}")
    if profile.passport_country:
        sections.append(f"Passport: {profile.passport_country}")

    # Travel Style
    sections.append(f"\nTravel Style: {profile.travel_style.replace('-', ' ').title()}")
    sections.append(f"Budget Preference: {profile.budget_preference.replace('-', ' ').title()}")
    sections.append(f"Monthly Budget: ${profile.monthly_budget}")
    sections.append(f"Income Type: {profile.income_type.replace('_', ' ').title()}")

    # Travel Preferences
    sections.append(f"\nRisk Tolerance: {profile.risk_tolerance.upper()}")
    sections.append(f"Comfort Level: {profile.comfort_threshold.replace('_', ' ')}")
    sections.append(f"Hygiene: {profile.hygiene_threshold.replace('_', ' ')}")
    sections.append(f"Travel Pace: {profile.travel_pace}")
    sections.append(f"Food Preference: {profile.food_preference.replace('_', ' ')}")
    sections.append(f"Pack Weight: {profile.pack_weight}")

    # Activity Preferences
    if profile.activity_weighting:
        aw = profile.activity_weighting
        sections.append(f"\nActivity Preferences:")
        sections.append(f"  - Party/Nightlife: {aw.party}%")
        sections.append(f"  - Nature/Outdoors: {aw.nature}%")
        sections.append(f"  - Culture/History: {aw.culture}%")
        sections.append(f"  - Adventure/Adrenaline: {aw.adventure}%")
        sections.append(f"  - Relaxation/Beach: {aw.relaxation}%")

    # Safety Profile
    safety_notes = []
    if not profile.walk_at_night:
        safety_notes.append("prefers not walking at night")
    if not profile.experienced_motos:
        safety_notes.append("NOT experienced with motorbikes")
    if profile.open_to_couchsurfing:
        safety_notes.append("open to couchsurfing")
    if profile.female_traveler_concerns:
        safety_notes.append("HAS FEMALE TRAVELER SAFETY CONCERNS - please provide relevant safety tips")
    if safety_notes:
        sections.append(f"\nSafety Notes: {', '.join(safety_notes)}")

    # Content Creation
    content_notes = []
    if profile.instagram_friendly:
        content_notes.append("wants Instagram-worthy spots")
    if profile.hidden_spots:
        content_notes.append("prefers hidden gems over tourist spots")
    if profile.video_focus:
        content_notes.append("creating video content")
    if profile.sunrise_sunset_optimization:
        content_notes.append("optimize for golden hour timing")
    if content_notes:
        sections.append(f"\nContent Goals: {', '.join(content_notes)}")

    # Travel History
    if profile.countries_visited:
        sections.append(f"\nCountries Visited ({len(profile.countries_visited)}): {', '.join(profile.countries_visited[:10])}")
        if len(profile.countries_visited) > 10:
            sections.append(f"  ...and {len(profile.countries_visited) - 10} more")

    if profile.bucket_list:
        sections.append(f"Bucket List: {', '.join(profile.bucket_list[:5])}")

    if profile.interests:
        sections.append(f"Interests: {', '.join(profile.interests)}")

    if profile.restrictions:
        sections.append(f"\n⚠️ RESTRICTIONS (MUST RESPECT): {', '.join(profile.restrictions)}")

    sections.append("="*50 + "\n")

    return "\n".join(sections)


def build_trip_context_section(trip: Optional[TripContext], profile: Optional[UserProfile]) -> str:
    """Build a comprehensive trip context section for the AI prompt."""
    if not trip:
        return ""

    sections = ["\n" + "="*50, "TRIP CONTEXT", "="*50]

    # Basic Trip Info
    sections.append(f"Duration: {trip.trip_duration_days} days")
    if trip.start_date:
        sections.append(f"Start Date: {trip.start_date}")
    sections.append(f"Daily Budget Target: ${trip.daily_budget_target}/day")

    # Language preference
    if trip.preferred_language and trip.preferred_language != "English":
        sections.append(f"\n🌍 IMPORTANT - RESPOND IN {trip.preferred_language.upper()}")
        sections.append(f"The user prefers responses in {trip.preferred_language}. Please respond entirely in {trip.preferred_language}.")

    # Transportation & Accommodation
    transport_str = ', '.join([s.replace('_', ' ') for s in trip.transportation_styles]) if trip.transportation_styles else 'mixed'
    accommodation_str = ', '.join([s.replace('_', ' ') for s in trip.accommodation_styles]) if trip.accommodation_styles else 'hostel dorm'
    sections.append(f"\nTransportation: {transport_str}")
    sections.append(f"Accommodation: {accommodation_str}")

    # Itinerary
    if trip.itinerary_breakdown:
        sections.append(f"\nPlanned Itinerary:")
        total_days = 0
        for i, stop in enumerate(trip.itinerary_breakdown, 1):
            notes = f" - {stop.notes}" if stop.notes else ""
            sections.append(f"  {i}. {stop.location}: {stop.days} days{notes}")
            total_days += stop.days
        sections.append(f"  Total planned: {total_days} days")

    # Trip Goals
    if trip.trip_goals:
        goal_labels = {
            'surf_progression': '🏄 Surf Progression',
            'volunteering': '🤝 Volunteering',
            'trekking_altitude': '🏔️ Trekking/Altitude',
            'remote_work': '💻 Remote Work',
            'nightlife': '🎉 Nightlife',
            'cultural_immersion': '🏛️ Cultural Immersion',
            'dating_forward': '💕 Meeting People',
            'cheap_adventure': '💸 Cheap Adventure',
            'photography': '📸 Photography',
            'food_mission': '🍜 Food Mission',
            'spiritual_journey': '🧘 Spiritual Journey',
            'language_learning': '🗣️ Language Learning',
        }
        sections.append(f"\nTrip Goals:")
        for goal in trip.trip_goals:
            label = goal_labels.get(goal, goal.replace('_', ' ').title())
            sections.append(f"  - {label}")

    if trip.custom_goals:
        sections.append(f"Custom Goals: {', '.join(trip.custom_goals)}")

    # Deal Breakers
    if trip.deal_breakers:
        sections.append(f"\n🚫 DEAL BREAKERS (NEVER SUGGEST): {', '.join(trip.deal_breakers)}")

    # Safety Overrides (use trip-specific if set, otherwise use profile defaults)
    override_notes = []

    # Walk at night
    walk_at_night = trip.walk_at_night_override if trip.walk_at_night_override is not None else (profile.walk_at_night if profile else True)
    if not walk_at_night:
        override_notes.append("avoid walking at night")

    # Motos
    experienced_motos = trip.experienced_motos_override if trip.experienced_motos_override is not None else (profile.experienced_motos if profile else False)
    if not experienced_motos:
        override_notes.append("no motorbike recommendations")

    # Couchsurfing
    open_to_couchsurfing = trip.open_to_couchsurfing_override if trip.open_to_couchsurfing_override is not None else (profile.open_to_couchsurfing if profile else False)
    if open_to_couchsurfing:
        override_notes.append("open to couchsurfing")

    if override_notes:
        sections.append(f"\nSafety Preferences for This Trip: {', '.join(override_notes)}")

    # Content Overrides
    content_notes = []
    instagram = trip.instagram_friendly_override if trip.instagram_friendly_override is not None else (profile.instagram_friendly if profile else False)
    hidden = trip.hidden_spots_override if trip.hidden_spots_override is not None else (profile.hidden_spots if profile else True)
    video = trip.video_focus_override if trip.video_focus_override is not None else (profile.video_focus if profile else False)

    if instagram:
        content_notes.append("Instagram-worthy spots")
    if hidden:
        content_notes.append("hidden gems preferred")
    if video:
        content_notes.append("video content focus")
    if content_notes:
        sections.append(f"Content Focus: {', '.join(content_notes)}")

    # Visa Info
    if trip.needs_visa:
        visa_info = "Needs visa"
        if trip.visa_on_arrival:
            visa_info += " (VOA available)"
        if trip.visa_notes:
            visa_info += f" - {trip.visa_notes}"
        sections.append(f"\nVisa: {visa_info}")

    sections.append("="*50 + "\n")

    return "\n".join(sections)


def build_conversation_variables_section(conv_vars: Optional[ConversationVarsInput]) -> str:
    """Build a section showing learned conversation context for personalization."""
    if not conv_vars:
        return ""

    # Check if there's anything meaningful to show
    has_content = (
        len(conv_vars.places_discussed) > 0 or
        len(conv_vars.places_to_avoid) > 0 or
        len(conv_vars.activity_preferences) > 0 or
        len(conv_vars.food_preferences) > 0 or
        len(conv_vars.accommodation_notes) > 0 or
        bool(conv_vars.travel_companions) or
        bool(conv_vars.pace_preference) or
        len(conv_vars.must_do_activities) > 0 or
        len(conv_vars.concerns) > 0 or
        len(conv_vars.budget_notes) > 0 or
        len(conv_vars.custom_notes) > 0
    )

    if not has_content:
        return ""

    sections = ["\n" + "="*50, "LEARNED FROM CONVERSATION", "="*50]
    sections.append("(Use this info naturally - don't repeat it back explicitly)")

    # Places discussed
    if conv_vars.places_discussed:
        sections.append(f"\nPlaces Discussed: {', '.join(conv_vars.places_discussed)}")

    # Places to avoid
    if conv_vars.places_to_avoid:
        sections.append(f"⛔ Places to AVOID: {', '.join(conv_vars.places_to_avoid)}")

    # Activity preferences
    if conv_vars.activity_preferences:
        sections.append(f"\nActivity Interests: {', '.join(conv_vars.activity_preferences)}")

    # Food preferences
    if conv_vars.food_preferences:
        sections.append(f"Food Preferences: {', '.join(conv_vars.food_preferences)}")

    # Accommodation notes
    if conv_vars.accommodation_notes:
        sections.append(f"Accommodation Notes: {', '.join(conv_vars.accommodation_notes)}")

    # Travel companions
    if conv_vars.travel_companions:
        sections.append(f"\nTraveling: {conv_vars.travel_companions}")

    # Pace preference
    if conv_vars.pace_preference:
        sections.append(f"Travel Pace: {conv_vars.pace_preference}")

    # Must-do activities
    if conv_vars.must_do_activities:
        sections.append(f"\n⭐ MUST-DO Activities: {', '.join(conv_vars.must_do_activities)}")

    # Concerns
    if conv_vars.concerns:
        sections.append(f"⚠️ Concerns: {', '.join(conv_vars.concerns)}")

    # Budget notes
    if conv_vars.budget_notes:
        sections.append(f"💰 Budget Notes: {', '.join(conv_vars.budget_notes)}")

    # Custom notes
    if conv_vars.custom_notes:
        for key, value in conv_vars.custom_notes.items():
            label = key.replace('_', ' ').title()
            sections.append(f"{label}: {value}")

    sections.append("="*50 + "\n")

    return "\n".join(sections)


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Non-streaming chat endpoint (kept for backwards compatibility)."""
    # Allow chat even without vectorstore - will use web search as fallback

    # Build context
    chat_history = []
    for msg in request.history:
        if msg["role"] == "user":
            chat_history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            chat_history.append(AIMessage(content=msg["content"]))

    user_profile_section = build_profile_section(request.user_profile)
    trip_context_section = build_trip_context_section(request.trip_context, request.user_profile)
    conversation_variables_section = build_conversation_variables_section(request.conversation_variables)

    # Get vector store context (if available)
    context = ""
    if retriever:
        try:
            if chat_history:
                contextualize_q_prompt = ChatPromptTemplate.from_messages([
                    ("system", "Given a chat history and the latest user question, formulate a standalone question. Do NOT answer, just reformulate if needed."),
                    MessagesPlaceholder("chat_history"),
                    ("human", "{input}"),
                ])
                standalone_q = (contextualize_q_prompt | llm | StrOutputParser()).invoke({
                    "input": request.message,
                    "chat_history": chat_history
                })
                docs = retriever.invoke(standalone_q)
            else:
                docs = retriever.invoke(request.message)
            context = format_docs(docs)
        except Exception as e:
            logging.warning(f"Vector retrieval failed: {e}")
            context = ""
    else:
        logging.info("No vector store available, using web search only")

    # Get Perplexity web context (hybrid search)
    web_context = await search_perplexity(request.message, request.destination)

    # Build and invoke final chain
    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", BASE_SYSTEM_TEMPLATE),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])

    chain = qa_prompt | llm | StrOutputParser()

    response = chain.invoke({
        "input": request.message,
        "chat_history": chat_history,
        "destination": request.destination,
        "budget": request.budget,
        "user_profile_section": user_profile_section,
        "trip_context_section": trip_context_section,
        "conversation_variables_section": conversation_variables_section,
        "context": context,
        "web_context": web_context or "No current web data available.",
    })

    return {"response": response}


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint with hybrid Perplexity + Vector DB search."""

    async def generate():
        try:
            # Build chat history
            chat_history = []
            for msg in request.history:
                if msg["role"] == "user":
                    chat_history.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    chat_history.append(AIMessage(content=msg["content"]))

            user_profile_section = build_profile_section(request.user_profile)
            trip_context_section = build_trip_context_section(request.trip_context, request.user_profile)
            conversation_variables_section = build_conversation_variables_section(request.conversation_variables)

            # Get vector store context (if available)
            context = ""
            if retriever:
                logging.info(f"[Stream] Starting retrieval for: {request.message[:50]}...")
                try:
                    if chat_history:
                        contextualize_q_prompt = ChatPromptTemplate.from_messages([
                            ("system", "Given a chat history and the latest user question, formulate a standalone question. Do NOT answer, just reformulate if needed."),
                            MessagesPlaceholder("chat_history"),
                            ("human", "{input}"),
                        ])
                        standalone_q = (contextualize_q_prompt | llm | StrOutputParser()).invoke({
                            "input": request.message,
                            "chat_history": chat_history
                        })
                        docs = retriever.invoke(standalone_q)
                    else:
                        docs = retriever.invoke(request.message)
                    context = format_docs(docs)
                except Exception as e:
                    logging.warning(f"[Stream] Vector retrieval failed: {e}")
                    context = ""
            else:
                logging.info("[Stream] No vector store available, using web search only")

            # Get Perplexity web context in parallel (hybrid search)
            logging.info("[Stream] Fetching Perplexity web context...")
            web_context = await search_perplexity(request.message, request.destination)

            # Build prompt
            qa_prompt = ChatPromptTemplate.from_messages([
                ("system", BASE_SYSTEM_TEMPLATE),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ])

            messages = qa_prompt.format_messages(
                input=request.message,
                chat_history=chat_history,
                destination=request.destination,
                budget=request.budget,
                user_profile_section=user_profile_section,
                trip_context_section=trip_context_section,
                conversation_variables_section=conversation_variables_section,
                context=context,
                web_context=web_context or "No current web data available.",
            )

            # Stream the response
            logging.info("[Stream] Starting LLM streaming...")
            streaming_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7, streaming=True)

            async for chunk in streaming_llm.astream(messages):
                if chunk.content:
                    # Send as Server-Sent Events format
                    yield f"data: {json.dumps({'content': chunk.content})}\n\n"

            # Signal end of stream
            yield f"data: {json.dumps({'done': True})}\n\n"
            logging.info("[Stream] Streaming complete")

        except Exception as e:
            logging.error(f"[Stream] Error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/health")
def health():
    return {"status": "ok"}


# ============================================
# LOCATION EXTRACTION FOR MAP PINS
# ============================================

class ExtractedLocation(BaseModel):
    name: str
    type: str  # hostel, restaurant, activity, landmark, transport, other
    description: str = ""
    area: str = ""  # The specific area/city/region this location is in (e.g., "Cotopaxi", "Quito Old Town")


class ExtractLocationsRequest(BaseModel):
    response_text: str
    destination: str


class ExtractLocationsResponse(BaseModel):
    locations: list[ExtractedLocation]


LOCATION_EXTRACTION_PROMPT = """Extract all specific, mappable locations from this travel recommendation text.

For each location found, provide:
- name: The specific name of the place (e.g., "Lub d Bangkok Silom", "Secret Garden Hostel", "Grand Palace")
- type: One of: accommodation, restaurant, activity, historic, transport, city, other
- description: A brief description from the context (1 sentence max)
- area: The specific area, city, region, or landmark this location is near or in (e.g., "Cotopaxi National Park", "Quito Old Town", "Banos"). This is CRITICAL for geocoding - extract the most specific geographic context from the surrounding text.

TYPE DEFINITIONS:
- accommodation: Hostels, hotels, guesthouses, Airbnbs, any place to stay
- restaurant: Restaurants, cafes, bars, food stalls, any eating/drinking establishment
- activity: Tours, hikes, adventure activities, beaches (for surfing/swimming), parks, natural attractions
- historic: Museums, temples, churches, historical monuments, town squares, cultural sites
- transport: Bus stations, airports, train stations, ferry terminals
- city: Cities, towns, villages, neighborhoods, beach towns (when mentioned as a destination, not an activity)
- other: Anything that doesn't fit the above categories

RULES:
1. Only extract SPECIFIC named locations that could be placed on a map
2. DO NOT extract general areas or vague descriptions (e.g., "the old town", "local markets") as the name
3. DO NOT extract countries or large regions as the name
4. IMPORTANT: Use "city" for towns/villages like Quito, Baños, Tena, Montañita, Canoa - NOT "landmark" or "other"
5. Use "restaurant" for ALL eating/drinking places including cafes, bars, breweries, food markets
6. Use "historic" for museums, temples, churches, historical sites - NOT for general towns
7. For the "area" field, use the most specific geographic context mentioned near the location in the text
8. If no specific locations are found, return an empty list
9. IMPORTANT - SPLIT ALTERNATIVES: When text mentions multiple places with "or", "and", or "/" between them, extract each as a SEPARATE location:
   - "Montañita or Canoa" → TWO entries: one for "Montañita" and one for "Canoa"
   - "Quilotoa and Cotopaxi" → TWO entries: one for "Quilotoa" and one for "Cotopaxi"
   - "Baños/Puyo" → TWO entries: one for "Baños" and one for "Puyo"

TEXT TO ANALYZE:
{text}

Respond with ONLY a JSON array of objects. Example:
[
  {{"name": "Secret Garden Hostel", "type": "accommodation", "description": "Eco-hostel with volcano views", "area": "Cotopaxi National Park"}},
  {{"name": "Cafe Mosaico", "type": "restaurant", "description": "Rooftop cafe with city views", "area": "Quito Old Town"}},
  {{"name": "Montañita", "type": "city", "description": "Beach town known for surfing and nightlife", "area": "Ecuador Coast"}},
  {{"name": "Canoa", "type": "city", "description": "Quieter beach town with great surf spots", "area": "Ecuador Coast"}},
  {{"name": "La Compañía de Jesús", "type": "historic", "description": "Stunning baroque church with gold-leaf interior", "area": "Quito Old Town"}}
]

If no locations found, respond with: []
"""


@app.post("/api/extract-locations", response_model=ExtractLocationsResponse)
async def extract_locations(request: ExtractLocationsRequest):
    """Extract mappable locations from AI response text."""
    import json
    import httpx

    try:
        # Use a fast model for extraction
        extraction_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

        prompt = LOCATION_EXTRACTION_PROMPT.format(text=request.response_text)
        result = extraction_llm.invoke(prompt)

        # Parse the JSON response
        content = result.content.strip()
        # Handle markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        locations_data = json.loads(content)

        # Validate and filter locations
        valid_types = {"accommodation", "restaurant", "activity", "historic", "transport", "city", "other"}
        # Map old types to new types for backwards compatibility
        type_mapping = {"hostel": "accommodation", "landmark": "historic"}
        locations = []
        for loc in locations_data:
            if isinstance(loc, dict) and "name" in loc:
                loc_type = loc.get("type", "other").lower()
                # Map old types to new types
                loc_type = type_mapping.get(loc_type, loc_type)
                if loc_type not in valid_types:
                    loc_type = "other"
                locations.append(ExtractedLocation(
                    name=loc["name"],
                    type=loc_type,
                    description=loc.get("description", ""),
                    area=loc.get("area", "")  # Geographic context for geocoding
                ))

        return ExtractLocationsResponse(locations=locations)

    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse location extraction response: {e}")
        return ExtractLocationsResponse(locations=[])
    except Exception as e:
        logging.error(f"Location extraction failed: {e}")
        return ExtractLocationsResponse(locations=[])


# ============================================
# GEOCODING ENDPOINT
# ============================================

class GeocodeRequest(BaseModel):
    place_name: str
    context: str = ""  # e.g., "Bangkok, Thailand" for better results
    city: str = ""  # Optional: specific city to search in (e.g., "Athens")


class GeocodeResponse(BaseModel):
    success: bool
    coordinates: Optional[list[float]] = None  # [lng, lat]
    formatted_name: Optional[str] = None


# Country name to ISO 3166-1 alpha-2 code mapping for Mapbox filtering
COUNTRY_CODES = {
    "ecuador": "ec",
    "peru": "pe",
    "colombia": "co",
    "bolivia": "bo",
    "chile": "cl",
    "argentina": "ar",
    "brazil": "br",
    "thailand": "th",
    "vietnam": "vn",
    "cambodia": "kh",
    "laos": "la",
    "myanmar": "mm",
    "indonesia": "id",
    "malaysia": "my",
    "singapore": "sg",
    "philippines": "ph",
    "japan": "jp",
    "south korea": "kr",
    "korea": "kr",
    "china": "cn",
    "india": "in",
    "nepal": "np",
    "sri lanka": "lk",
    "mexico": "mx",
    "guatemala": "gt",
    "belize": "bz",
    "honduras": "hn",
    "nicaragua": "ni",
    "costa rica": "cr",
    "panama": "pa",
    "spain": "es",
    "portugal": "pt",
    "france": "fr",
    "italy": "it",
    "germany": "de",
    "netherlands": "nl",
    "belgium": "be",
    "greece": "gr",
    "turkey": "tr",
    "morocco": "ma",
    "egypt": "eg",
    "south africa": "za",
    "kenya": "ke",
    "tanzania": "tz",
    "australia": "au",
    "new zealand": "nz",
    "usa": "us",
    "united states": "us",
    "canada": "ca",
    "uk": "gb",
    "united kingdom": "gb",
    "england": "gb",
}

# Known city center points for proximity-based geocoding (lng, lat)
# Using proximity is better than bounding boxes for POI searches
CITY_CENTERS = {
    # Europe
    "athens": (23.73, 37.98),
    "london": (-0.12, 51.51),
    "paris": (2.35, 48.86),
    "barcelona": (2.17, 41.39),
    "lisbon": (-9.14, 38.72),
    "berlin": (13.41, 52.52),
    "amsterdam": (4.90, 52.37),
    "rome": (12.50, 41.90),
    "prague": (14.42, 50.08),

    # Southeast Asia
    "bangkok": (100.50, 13.76),
    "bali": (115.19, -8.41),
    "ubud": (115.26, -8.51),
    "chiang mai": (98.99, 18.79),
    "hanoi": (105.85, 21.03),
    "ho chi minh": (106.63, 10.82),
    "saigon": (106.63, 10.82),
    "singapore": (103.82, 1.35),
    "kuala lumpur": (101.69, 3.14),
    "phnom penh": (104.92, 11.56),
    "siem reap": (103.86, 13.36),

    # East Asia
    "tokyo": (139.69, 35.69),
    "seoul": (126.98, 37.57),
    "hong kong": (114.17, 22.32),

    # South America - Ecuador
    "quito": (-78.47, -0.18),
    "ecuador": (-78.47, -0.18),  # Default to Quito for Ecuador
    "guayaquil": (-79.90, -2.17),
    "cuenca": (-79.01, -2.90),
    "banos": (-78.42, -1.40),
    "baños": (-78.42, -1.40),
    "cotopaxi": (-78.44, -0.68),
    "otavalo": (-78.26, 0.23),
    "mindo": (-78.77, -0.05),
    "montanita": (-80.75, -1.83),
    "galapagos": (-90.35, -0.74),
    "quilotoa": (-78.90, -0.86),
    "tena": (-77.81, -1.00),
    "puyo": (-77.99, -1.49),
    "riobamba": (-78.65, -1.67),
    "loja": (-79.20, -4.00),
    # Ecuador mountains/volcanoes
    "illiniza": (-78.71, -0.66),
    "illiniza norte": (-78.71, -0.66),
    "illiniza sur": (-78.71, -0.66),
    "chimborazo": (-78.82, -1.47),
    "cayambe": (-77.99, 0.03),
    "antisana": (-78.14, -0.48),
    "tungurahua": (-78.44, -1.47),
    "sangay": (-78.34, -2.07),
    "el altar": (-78.41, -1.68),
    "pichincha": (-78.60, -0.17),
    "pasochoa": (-78.49, -0.44),
    "imbabura": (-78.18, 0.26),
    "cotacachi": (-78.33, 0.37),
    # South America - Colombia
    "bogota": (-74.07, 4.71),
    "medellin": (-75.56, 6.25),
    "cartagena": (-75.51, 10.39),
    "lima": (-77.03, -12.05),
    "cusco": (-71.97, -13.53),
    "arequipa": (-71.54, -16.41),
    "buenos aires": (-58.38, -34.60),
    "rio de janeiro": (-43.17, -22.91),
    "santiago": (-70.65, -33.45),
    "la paz": (-68.15, -16.50),
    "bolivia": (-68.15, -16.50),

    # Central America
    "mexico city": (-99.13, 19.43),
    "cancun": (-86.85, 21.16),
    "guatemala city": (-90.51, 14.63),

    # North America
    "new york": (-74.01, 40.71),
    "los angeles": (-118.24, 34.05),
    "san francisco": (-122.42, 37.77),

    # Middle East
    "dubai": (55.27, 25.20),
    "istanbul": (29.00, 41.01),

    # Africa
    "cape town": (18.42, -33.93),
    "marrakech": (-8.01, 31.63),

    # Oceania
    "sydney": (151.21, -33.87),
    "melbourne": (144.96, -37.81),
    "auckland": (174.76, -36.85),
}


async def geocode_with_google(query: str, region_bias: str = None) -> dict | None:
    """Try to geocode using Google Geocoding API (most accurate).

    Args:
        query: The search query (should include location context like "Illiniza Norte, Ecuador")
        region_bias: Optional ISO 3166-1 alpha-2 country code for region biasing
    """
    import httpx
    from urllib.parse import quote

    google_api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not google_api_key:
        logging.info("[Google Geocoding] No API key configured, skipping")
        return None

    try:
        params = {
            "address": query,
            "key": google_api_key,
        }

        # Add region bias if provided
        if region_bias:
            params["region"] = region_bias
            logging.info(f"[Google Geocoding] Using region bias: {region_bias}")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params=params,
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                status = data.get("status")

                if status == "OK":
                    results = data.get("results", [])
                    if results:
                        # Get the first (most relevant) result
                        result = results[0]
                        location = result.get("geometry", {}).get("location", {})
                        lat = location.get("lat")
                        lng = location.get("lng")
                        formatted_address = result.get("formatted_address", query)

                        if lat and lng:
                            logging.info(f"[Google Geocoding] SUCCESS: {formatted_address} at [{lng}, {lat}]")
                            return {
                                "coordinates": [lng, lat],  # Mapbox format: [lng, lat]
                                "formatted_name": formatted_address,
                                "is_exact": True
                            }

                elif status == "ZERO_RESULTS":
                    logging.info(f"[Google Geocoding] No results for: {query}")
                else:
                    logging.warning(f"[Google Geocoding] API returned status: {status}")

            else:
                logging.error(f"[Google Geocoding] HTTP error: {response.status_code}")

    except Exception as e:
        logging.error(f"[Google Geocoding] Error: {e}")

    return None


async def geocode_with_nominatim(query: str, viewbox: tuple = None) -> dict | None:
    """Try to geocode using OpenStreetMap Nominatim (better for hostels/hotels)."""
    import httpx
    from urllib.parse import quote

    try:
        params = {
            "q": query,
            "format": "json",
            "limit": 5,
            "addressdetails": 1,
        }

        # Add viewbox for region bias if we have it
        if viewbox:
            params["viewbox"] = f"{viewbox[0]},{viewbox[1]},{viewbox[2]},{viewbox[3]}"
            params["bounded"] = 0  # Prefer but don't require results in viewbox

        headers = {
            "User-Agent": "TBB-TripPlanner/1.0 (contact@thebrokebackpacker.com)"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params=params,
                headers=headers,
                timeout=10.0
            )

            if response.status_code == 200:
                results = response.json()
                logging.info(f"[Nominatim] Found {len(results)} results for '{query}'")

                for result in results:
                    osm_type = result.get("type", "")
                    osm_class = result.get("class", "")
                    display_name = result.get("display_name", "")
                    lat = float(result.get("lat", 0))
                    lon = float(result.get("lon", 0))
                    importance = float(result.get("importance", 0))

                    logging.info(f"[Nominatim] Result: {display_name[:60]}... (class: {osm_class}, type: {osm_type}, importance: {importance:.3f})")

                    # Accept tourism-related POIs (hostels, hotels, attractions, etc.)
                    tourism_types = {"hostel", "hotel", "guest_house", "motel", "attraction", "museum", "viewpoint", "camp_site"}
                    amenity_types = {"restaurant", "cafe", "bar", "pub", "fast_food", "bus_station", "ferry_terminal"}

                    if osm_class == "tourism" or osm_type in tourism_types:
                        logging.info(f"[Nominatim] SUCCESS (tourism): {display_name[:60]} at [{lon}, {lat}]")
                        return {"coordinates": [lon, lat], "formatted_name": display_name}

                    if osm_class == "amenity" or osm_type in amenity_types:
                        logging.info(f"[Nominatim] SUCCESS (amenity): {display_name[:60]} at [{lon}, {lat}]")
                        return {"coordinates": [lon, lat], "formatted_name": display_name}

                    # Accept leisure/natural for activities
                    if osm_class in {"leisure", "natural", "historic"}:
                        logging.info(f"[Nominatim] SUCCESS ({osm_class}): {display_name[:60]} at [{lon}, {lat}]")
                        return {"coordinates": [lon, lat], "formatted_name": display_name}

                logging.info("[Nominatim] No suitable POI found in results")
                return None

    except Exception as e:
        logging.error(f"[Nominatim] Error: {e}")
        return None


async def geocode_with_mapbox(query: str, proximity: tuple = None, allow_place_fallback: bool = False, country_code: str = None) -> dict | None:
    """Try to geocode using Mapbox (fallback).

    Args:
        query: The search query
        proximity: Optional (lng, lat) tuple for bias
        allow_place_fallback: If True, allow place/locality type results
        country_code: Optional ISO 3166-1 alpha-2 country code to restrict results
    """
    import httpx
    from urllib.parse import quote

    mapbox_token = os.getenv("MAPBOX_ACCESS_TOKEN")
    if not mapbox_token:
        return None

    try:
        params = {
            "access_token": mapbox_token,
            "limit": 5,
            "types": "poi,address,place,locality" if allow_place_fallback else "poi,address"
        }

        if proximity:
            params["proximity"] = f"{proximity[0]},{proximity[1]}"

        # Add country restriction if provided - this is crucial for accuracy
        if country_code:
            params["country"] = country_code
            logging.info(f"[Mapbox] Restricting search to country: {country_code}")

        encoded_query = quote(query)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded_query}.json",
                params=params,
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                features = data.get("features", [])
                logging.info(f"[Mapbox] Found {len(features)} results for '{query}'")

                best_place_fallback = None
                for feature in features:
                    place_type = feature.get("place_type", [])
                    relevance = feature.get("relevance", 0)
                    place_name = feature.get("place_name", "")
                    coords = feature.get("center", [])

                    logging.info(f"[Mapbox] Result: {place_name[:60]}... (type: {place_type}, relevance: {relevance:.2f})")

                    # Prefer actual POIs with good relevance
                    if "poi" in place_type and relevance > 0.6:
                        logging.info(f"[Mapbox] SUCCESS (POI): {place_name[:60]} at {coords}")
                        return {"coordinates": coords, "formatted_name": place_name, "is_exact": True}

                    # Store first place/locality-type result as potential fallback
                    if allow_place_fallback and best_place_fallback is None and relevance > 0.5:
                        if "place" in place_type or "locality" in place_type:
                            best_place_fallback = {"coordinates": coords, "formatted_name": place_name, "is_exact": False}

                # Return place fallback if no POI found
                if best_place_fallback:
                    logging.info(f"[Mapbox] SUCCESS (place fallback): {best_place_fallback['formatted_name'][:60]} at {best_place_fallback['coordinates']}")
                    return best_place_fallback

                logging.info("[Mapbox] No POI matches found")
                return None

    except Exception as e:
        logging.error(f"[Mapbox] Error: {e}")
        return None


@app.post("/api/geocode", response_model=GeocodeResponse)
async def geocode_location(request: GeocodeRequest):
    """Geocode a place name using multiple services for best results.

    Strategy:
    1. Check if place name is a known location (mountains, landmarks, etc.)
    2. Try Google Geocoding first (most accurate, especially for landmarks/mountains)
    3. Try Nominatim (OpenStreetMap) - good for hostels/hotels
    4. Fall back to Mapbox if others don't find a POI
    """

    # Build the search query
    location_context = (request.city if request.city else request.context or "").strip()
    place_name_lower = request.place_name.lower().strip()

    # FIRST: Check if the place name itself is in CITY_CENTERS (for mountains, landmarks, etc.)
    # This handles cases like "Illiniza Norte" which might not be in geocoding services
    for known_place, center in CITY_CENTERS.items():
        if known_place in place_name_lower or place_name_lower in known_place:
            logging.info(f"[Geocode] Direct match found in CITY_CENTERS: {known_place} at {center}")
            return GeocodeResponse(
                success=True,
                coordinates=[center[0], center[1]],
                formatted_name=f"{request.place_name}, {location_context}" if location_context else request.place_name
            )

    # Extract country code from context for API filtering
    country_code = None
    context_lower = location_context.lower()
    for country_name, code in COUNTRY_CODES.items():
        if country_name in context_lower:
            country_code = code
            logging.info(f"[Geocode] Detected country code: {code} from context '{location_context}'")
            break

    # Get proximity point for the area
    proximity_point = None
    viewbox = None
    city_key = location_context.lower()
    for known_city, center in CITY_CENTERS.items():
        if known_city in city_key:
            proximity_point = center
            # Create a viewbox around the city (roughly 50km in each direction)
            viewbox = (center[0] - 0.5, center[1] + 0.5, center[0] + 0.5, center[1] - 0.5)
            logging.info(f"[Geocode] Using region bias for {known_city}: {center}")
            break

    # Build different query variations to try
    queries_to_try = []

    # Primary query: name + context
    if location_context and location_context.lower() not in ["general", ""]:
        queries_to_try.append(f"{request.place_name}, {location_context}")

    # Also try just the name
    queries_to_try.append(request.place_name)

    logging.info(f"[Geocode] Searching for: {queries_to_try} (country_code={country_code})")

    # Try Google Geocoding first (most accurate, especially for mountains/landmarks)
    for query in queries_to_try:
        result = await geocode_with_google(query, region_bias=country_code)
        if result:
            logging.info(f"[Geocode] SUCCESS via Google: {result['formatted_name']}")
            return GeocodeResponse(
                success=True,
                coordinates=result["coordinates"],
                formatted_name=result["formatted_name"]
            )

    # Try Nominatim (better for accommodations like hostels/hotels)
    for query in queries_to_try:
        result = await geocode_with_nominatim(query, viewbox)
        if result:
            logging.info(f"[Geocode] SUCCESS via Nominatim: {result['formatted_name']}")
            return GeocodeResponse(
                success=True,
                coordinates=result["coordinates"],
                formatted_name=result["formatted_name"]
            )

    # Fall back to Mapbox (strict POI mode) WITH country restriction
    for query in queries_to_try:
        result = await geocode_with_mapbox(query, proximity_point, allow_place_fallback=False, country_code=country_code)
        if result:
            return GeocodeResponse(
                success=True,
                coordinates=result["coordinates"],
                formatted_name=result["formatted_name"]
            )

    # Final fallback: allow place-type results (city/town level) WITH country restriction
    # This is better than nothing - at least puts the pin in the right general area
    logging.info(f"[Geocode] No POI found, trying place-type fallback...")
    for query in queries_to_try:
        result = await geocode_with_mapbox(query, proximity_point, allow_place_fallback=True, country_code=country_code)
        if result:
            is_exact = result.get("is_exact", False)
            logging.info(f"[Geocode] Using place fallback (is_exact={is_exact}): {result['formatted_name']}")
            return GeocodeResponse(
                success=True,
                coordinates=result["coordinates"],
                formatted_name=result["formatted_name"] + (" (approximate)" if not is_exact else "")
            )

    logging.warning(f"[Geocode] FAILED: No POI found for '{request.place_name}' in any service")
    return GeocodeResponse(success=False)


# ============================================
# COST EXTRACTION AND ESTIMATION
# ============================================

class ExtractedCost(BaseModel):
    category: str  # accommodation, transport_local, transport_flights, food, activities, visa_border, sim_connectivity, moped_rental, misc
    name: str
    amount: float  # USD
    quantity: float = 1.0
    unit: str = "trip"  # night, day, meal, trip, person
    notes: str = ""
    text_to_match: str = ""  # Exact text from original to place button after


class TouristTrapWarning(BaseModel):
    name: str
    description: str
    location: str = ""


class ExtractCostsRequest(BaseModel):
    response_text: str
    destination: str
    num_travelers: int = 1  # Number of people traveling together


class ExtractCostsResponse(BaseModel):
    costs: list[ExtractedCost]
    tourist_traps: list[TouristTrapWarning]


COST_EXTRACTION_PROMPT = """Extract SPECIFIC, NAMED costs from this travel advice text. Only extract costs tied to identifiable items.

NUMBER OF TRAVELERS: {num_travelers}

WHAT TO EXTRACT (costs with SPECIFIC NAMES):
✅ "Secret Garden Hostel: $15/night" → Extract (named hostel)
✅ "Quilotoa Loop bus ticket: $5" → Extract (named route/service)
✅ "Cotopaxi guided climb: $180" → Extract (named activity)
✅ "World Nomads Explorer Plan: $356" → Extract (named product)
✅ "Claro SIM card: $10" → Extract (named brand/product)
✅ "Swing at the End of the World entrance: $5" → Extract (named attraction)

WHAT NOT TO EXTRACT (vague/general mentions):
❌ "budget around $50/day" → Skip (general guidance, not a specific item)
❌ "food costs about $10-15" → Skip (range without specific item)
❌ "expect to spend $30 on accommodation" → Skip (no specific hostel named)
❌ "transport will run you about $20" → Skip (no specific service named)
❌ "you can get by on $40/day" → Skip (general daily budget)
❌ "allocate $500 for activities" → Skip (category total, not specific items)

For each NAMED cost found, provide:
- category: One of: accommodation, transport_local, transport_flights, food, activities, visa_border, sim_connectivity, moped_rental, misc
- name: The SPECIFIC name (hostel name, tour name, restaurant name, product name)
- amount: Unit price in USD
- quantity: Number of units (nights, days, people, etc.)
- unit: One of: night, day, meal, trip, person, month, week
- notes: Brief context
- text_to_match: EXACT unique phrase from the text where this cost appears (for button placement)

TOURIST TRAPS: Extract warnings about scams or overpriced places:
- name: The trap/scam name
- description: What to watch out for
- location: Where (optional)

CRITICAL RULES:
1. ONLY extract costs with SPECIFIC NAMED items - the name should be something you could Google
2. Skip general budget advice, ranges, or category estimates
3. The "name" field should be a proper noun or specific product/service name
4. Convert local currencies to USD
5. Parse quantities: "5 nights x $30" → amount: 30, quantity: 5
6. For per-person costs, set quantity to {num_travelers}
7. text_to_match must be unique - include the item name AND price for uniqueness

TEXT TO ANALYZE:
{text}

Respond with ONLY valid JSON:
{{
  "costs": [
    {{"category": "accommodation", "name": "Secret Garden Hostel", "amount": 15, "quantity": 3, "unit": "night", "notes": "eco-hostel near Cotopaxi", "text_to_match": "Secret Garden Hostel: $15/night"}},
    {{"category": "activities", "name": "Quilotoa Loop Trek", "amount": 25, "quantity": {num_travelers}, "unit": "person", "notes": "includes guide", "text_to_match": "Quilotoa Loop Trek: $25 per person"}}
  ],
  "tourist_traps": [
    {{"name": "Taxi overcharging", "description": "Always negotiate or use apps", "location": "Quito Airport"}}
  ]
}}

If no SPECIFIC named costs found, respond with: {{"costs": [], "tourist_traps": []}}
"""


@app.post("/api/extract-costs", response_model=ExtractCostsResponse)
async def extract_costs(request: ExtractCostsRequest):
    """Extract cost information and tourist trap warnings from AI response text."""
    import json

    try:
        extraction_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

        prompt = COST_EXTRACTION_PROMPT.format(text=request.response_text, num_travelers=request.num_travelers)
        result = extraction_llm.invoke(prompt)

        content = result.content.strip()
        # Handle markdown code blocks
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        data = json.loads(content)

        valid_categories = {"accommodation", "transport_local", "transport_flights", "food", "activities", "visa_border", "sim_connectivity", "moped_rental", "misc"}
        valid_units = {"night", "day", "meal", "trip", "person", "month", "week"}

        costs = []
        for c in data.get("costs", []):
            if isinstance(c, dict) and "name" in c and "amount" in c:
                cat = c.get("category", "misc").lower()
                if cat not in valid_categories:
                    cat = "misc"
                unit = c.get("unit", "trip").lower()
                if unit not in valid_units:
                    unit = "trip"
                costs.append(ExtractedCost(
                    category=cat,
                    name=c["name"],
                    amount=float(c.get("amount", 0)),
                    quantity=float(c.get("quantity", 1)),
                    unit=unit,
                    notes=c.get("notes", ""),
                    text_to_match=c.get("text_to_match", "")
                ))

        tourist_traps = []
        for t in data.get("tourist_traps", []):
            if isinstance(t, dict) and "name" in t:
                tourist_traps.append(TouristTrapWarning(
                    name=t["name"],
                    description=t.get("description", ""),
                    location=t.get("location", "")
                ))

        logging.info(f"[Cost Extraction] Found {len(costs)} costs and {len(tourist_traps)} tourist traps")
        return ExtractCostsResponse(costs=costs, tourist_traps=tourist_traps)

    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse cost extraction response: {e}")
        return ExtractCostsResponse(costs=[], tourist_traps=[])
    except Exception as e:
        logging.error(f"Cost extraction failed: {e}")
        return ExtractCostsResponse(costs=[], tourist_traps=[])


# Regional cost estimates (average USD per day)
REGION_COST_ESTIMATES = {
    "southeast_asia": {
        "accommodation": 12,  # hostel dorm
        "food": 15,  # 3 meals
        "transport_local": 5,
        "sim_connectivity": 10,  # per month
        "moped_rental": 8,  # per day
    },
    "south_america": {
        "accommodation": 15,
        "food": 18,
        "transport_local": 8,
        "sim_connectivity": 15,
        "moped_rental": 12,
    },
    "europe": {
        "accommodation": 30,
        "food": 35,
        "transport_local": 12,
        "sim_connectivity": 20,
        "moped_rental": 25,
    },
    "default": {
        "accommodation": 20,
        "food": 25,
        "transport_local": 10,
        "sim_connectivity": 15,
        "moped_rental": 15,
    }
}

COUNTRY_TO_REGION = {
    # Southeast Asia
    "thailand": "southeast_asia", "vietnam": "southeast_asia", "cambodia": "southeast_asia",
    "laos": "southeast_asia", "myanmar": "southeast_asia", "indonesia": "southeast_asia",
    "philippines": "southeast_asia", "malaysia": "southeast_asia", "singapore": "southeast_asia",
    # South America
    "ecuador": "south_america", "peru": "south_america", "colombia": "south_america",
    "bolivia": "south_america", "argentina": "south_america", "chile": "south_america",
    "brazil": "south_america", "uruguay": "south_america", "paraguay": "south_america",
    # Europe
    "spain": "europe", "portugal": "europe", "france": "europe", "italy": "europe",
    "germany": "europe", "netherlands": "europe", "greece": "europe", "croatia": "europe",
}


class EstimateCostsRequest(BaseModel):
    destination: str
    trip_duration_days: int
    accommodation_style: str = "hostel_dorm"  # hostel_dorm, hostel_private, guesthouse, etc.
    transportation_style: str = "mixed"  # bus, moto, flights, etc.
    include_moped: bool = False
    include_flights: int = 0  # number of internal flights


class EstimateCostsResponse(BaseModel):
    costs: list[ExtractedCost]
    daily_estimate: float
    total_estimate: float
    region: str


@app.post("/api/estimate-costs", response_model=EstimateCostsResponse)
async def estimate_costs(request: EstimateCostsRequest):
    """Generate cost estimates based on destination and trip parameters."""

    # Determine region
    destination_lower = request.destination.lower()
    region = "default"
    for country, reg in COUNTRY_TO_REGION.items():
        if country in destination_lower:
            region = reg
            break

    estimates = REGION_COST_ESTIMATES.get(region, REGION_COST_ESTIMATES["default"])

    costs = []

    # Accommodation
    accom_multiplier = 1.0
    if request.accommodation_style == "hostel_private":
        accom_multiplier = 2.0
    elif request.accommodation_style == "guesthouse":
        accom_multiplier = 2.5
    elif request.accommodation_style == "apartment":
        accom_multiplier = 3.0

    costs.append(ExtractedCost(
        category="accommodation",
        name=f"{request.accommodation_style.replace('_', ' ').title()} ({region.replace('_', ' ').title()} avg)",
        amount=estimates["accommodation"] * accom_multiplier,
        quantity=request.trip_duration_days,
        unit="night",
        notes="Estimated based on region averages"
    ))

    # Food
    costs.append(ExtractedCost(
        category="food",
        name="Daily food budget",
        amount=estimates["food"],
        quantity=request.trip_duration_days,
        unit="day",
        notes="3 meals per day, local food"
    ))

    # Local transport
    costs.append(ExtractedCost(
        category="transport_local",
        name="Local transport (buses, tuk-tuks, etc.)",
        amount=estimates["transport_local"],
        quantity=request.trip_duration_days,
        unit="day",
        notes="Estimated daily transport within cities"
    ))

    # SIM card
    costs.append(ExtractedCost(
        category="sim_connectivity",
        name="Local SIM card with data",
        amount=estimates["sim_connectivity"],
        quantity=1,
        unit="trip",
        notes="Monthly plan, one-time cost"
    ))

    # Moped rental if requested
    if request.include_moped:
        costs.append(ExtractedCost(
            category="moped_rental",
            name="Moped/scooter rental",
            amount=estimates["moped_rental"],
            quantity=request.trip_duration_days,
            unit="day",
            notes="Daily rental rate"
        ))

    # Internal flights if any
    if request.include_flights > 0:
        flight_cost = 80 if region == "southeast_asia" else 120 if region == "south_america" else 150
        costs.append(ExtractedCost(
            category="transport_flights",
            name="Internal flight",
            amount=flight_cost,
            quantity=request.include_flights,
            unit="trip",
            notes="Estimated based on region"
        ))

    # Calculate totals
    total = sum(c.amount * c.quantity for c in costs)
    daily = total / request.trip_duration_days if request.trip_duration_days > 0 else 0

    return EstimateCostsResponse(
        costs=costs,
        daily_estimate=round(daily, 2),
        total_estimate=round(total, 2),
        region=region
    )


# ============================================
# PACKING LIST GENERATION
# ============================================

class PackingItemOutput(BaseModel):
    name: str
    category: str  # clothing, electronics, toiletries, documents, gear, medical, misc
    quantity: int = 1
    notes: str = ""


class GeneratePackingListRequest(BaseModel):
    destination: str
    trip_duration: int = 14
    bucket_list: list[str] = []
    activities: list[str] = []
    accommodation_style: str = "hostel_dorm"
    pack_weight: str = "moderate"  # minimalist, moderate, maximalist
    electronics_tolerance: str = "medium"  # low, medium, high
    hygiene_threshold: str = "every_3_days"  # daily, every_3_days, broke_backpacker_mode
    travel_style: str = "solo"  # solo, couple, group, family
    female_traveler_concerns: bool = False


class GeneratePackingListResponse(BaseModel):
    items: list[PackingItemOutput]


PACKING_LIST_PROMPT = """Generate a personalized packing list for a backpacker trip.

TRIP DETAILS:
- Destination: {destination}
- Duration: {trip_duration} days
- Accommodation: {accommodation_style}
- Pack Weight Preference: {pack_weight}
- Electronics Tolerance: {electronics_tolerance}
- Hygiene Level: {hygiene_threshold}
- Travel Style: {travel_style}
- Female Traveler Concerns: {female_traveler_concerns}

BUCKET LIST / PLANNED ACTIVITIES:
{bucket_list}

TRIP GOALS:
{activities}

PACKING GUIDELINES BY WEIGHT PREFERENCE:
- minimalist: Absolute essentials only, pack light (under 30L), wash clothes frequently
- moderate: Balance of essentials and comfort items (30-45L)
- maximalist: Full comfort with extras (45L+)

HYGIENE GUIDELINES:
- daily: Plan for daily showering, bring more toiletries
- every_3_days: Standard backpacker hygiene
- broke_backpacker_mode: Minimal toiletries, embrace the adventure

ELECTRONICS BY TOLERANCE:
- low: Phone and charger only
- medium: Phone, charger, maybe a kindle or small camera
- high: Laptop, camera, drone, power bank, multiple chargers

Generate a practical packing list with items categorized as:
- clothing: Shirts, pants, underwear, socks, shoes, layers, swimwear, etc.
- electronics: Devices, chargers, adapters, etc.
- toiletries: Hygiene products, sunscreen, etc.
- documents: Passport, copies, cards, etc.
- gear: Backpack accessories, locks, towels, etc.
- medical: First aid, medications, etc.
- misc: Other useful items

Consider the specific activities and destinations. For example:
- Hiking/trekking: hiking shoes, quick-dry clothes, rain gear
- Beach: swimsuit, reef-safe sunscreen, sarong
- Temples/cultural sites: modest clothing, scarf for covering
- Nightlife: one nice outfit
- Surfing: rash guard, board shorts

Respond with ONLY valid JSON array of items:
[
  {{"name": "Quick-dry T-shirts", "category": "clothing", "quantity": 3, "notes": "Merino wool recommended"}},
  {{"name": "Travel towel", "category": "gear", "quantity": 1, "notes": "Microfiber, quick-dry"}},
  {{"name": "Passport", "category": "documents", "quantity": 1, "notes": "Check expiry 6+ months"}}
]
"""


@app.post("/api/generate-packing-list", response_model=GeneratePackingListResponse)
async def generate_packing_list(request: GeneratePackingListRequest):
    """Generate a personalized packing list based on trip details and user preferences."""
    import json

    try:
        extraction_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

        # Format bucket list
        bucket_list_str = "\n".join([f"- {item}" for item in request.bucket_list]) if request.bucket_list else "None specified"

        # Format activities
        activities_str = "\n".join([f"- {act.replace('_', ' ').title()}" for act in request.activities]) if request.activities else "General exploration"

        prompt = PACKING_LIST_PROMPT.format(
            destination=request.destination,
            trip_duration=request.trip_duration,
            accommodation_style=request.accommodation_style.replace('_', ' '),
            pack_weight=request.pack_weight,
            electronics_tolerance=request.electronics_tolerance,
            hygiene_threshold=request.hygiene_threshold.replace('_', ' '),
            travel_style=request.travel_style,
            female_traveler_concerns="Yes - include female-specific items" if request.female_traveler_concerns else "No",
            bucket_list=bucket_list_str,
            activities=activities_str,
        )

        result = extraction_llm.invoke(prompt)

        content = result.content.strip()
        # Handle markdown code blocks
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        items_data = json.loads(content)

        valid_categories = {"clothing", "electronics", "toiletries", "documents", "gear", "medical", "misc"}

        items = []
        for item in items_data:
            if isinstance(item, dict) and "name" in item:
                cat = item.get("category", "misc").lower()
                if cat not in valid_categories:
                    cat = "misc"
                items.append(PackingItemOutput(
                    name=item["name"],
                    category=cat,
                    quantity=int(item.get("quantity", 1)),
                    notes=item.get("notes", "")
                ))

        logging.info(f"[Packing List] Generated {len(items)} items for {request.destination}")
        return GeneratePackingListResponse(items=items)

    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse packing list response: {e}")
        return GeneratePackingListResponse(items=[])
    except Exception as e:
        logging.error(f"Packing list generation failed: {e}")
        return GeneratePackingListResponse(items=[])


# ============================================
# EVENT DISCOVERY (Perplexity-powered)
# ============================================

class EventItem(BaseModel):
    name: str
    event_type: str  # festival, concert, holiday, market, sports, cultural, other
    date_range: str  # "Dec 15-20" or "Every Sunday" or "Late December"
    location: str  # Specific city/area
    description: str
    is_free: bool = False
    estimated_price_usd: float | None = None  # Estimated cost in USD (None if unknown)
    budget_tip: str = ""  # e.g., "Buy tickets early" or "Free entry"
    backpacker_rating: int = 3  # 1-5, how good for backpackers


class DiscoverEventsRequest(BaseModel):
    destination: str
    start_date: str  # ISO format: "2025-01-15"
    end_date: str  # ISO format: "2025-02-15"
    interests: list[str] = []  # music, culture, food, sports, nature, nightlife


class DiscoverEventsResponse(BaseModel):
    events: list[EventItem]
    travel_advisory: str = ""  # Any relevant warnings or tips


@app.post("/api/discover-events", response_model=DiscoverEventsResponse)
async def discover_events(request: DiscoverEventsRequest):
    """Discover events, festivals, and happenings at destination during trip dates."""
    if not PERPLEXITY_API_KEY:
        logging.warning("Perplexity API key not found, cannot discover events")
        return DiscoverEventsResponse(events=[], travel_advisory="Event discovery requires Perplexity API key")

    try:
        # Format interests for the query
        interests_str = ", ".join(request.interests) if request.interests else "general travel experiences"

        # Build a detailed query for Perplexity
        query = f"""Find events, festivals, holidays, and special happenings in {request.destination} between {request.start_date} and {request.end_date}.

Focus on:
- Local festivals and cultural celebrations
- Music events, concerts, DJ nights
- Food festivals and night markets
- National holidays and observances
- Sports events
- Weekly markets or recurring events
- Any special backpacker-friendly events

User interests: {interests_str}

For each event, provide:
1. Event name
2. Type (festival/concert/holiday/market/sports/cultural/other)
3. Date or date range
4. Specific location/venue
5. Brief description
6. Whether it's free
7. Estimated price in USD (for non-free events, what would a budget traveler typically spend? Include entry fee + reasonable food/drinks)
8. Budget tip for attending
9. Rating 1-5 for backpacker appeal (5 = must-see for backpackers)

Also note any travel advisories, crowding concerns, or booking tips for this period.

Return as JSON:
{{
  "events": [
    {{
      "name": "Event Name",
      "event_type": "festival",
      "date_range": "Jan 15-17",
      "location": "City Center",
      "description": "Brief description",
      "is_free": true,
      "estimated_price_usd": 0,
      "budget_tip": "Arrive early for free entry",
      "backpacker_rating": 5
    }}
  ],
  "travel_advisory": "Any relevant warnings or tips for this period"
}}"""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.perplexity.ai/chat/completions",
                headers={
                    "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "sonar",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a travel event researcher. Find current, accurate event information. Always respond with valid JSON only, no markdown formatting."
                        },
                        {
                            "role": "user",
                            "content": query
                        }
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.2,
                    "search_recency_filter": "month"
                }
            )

            if response.status_code != 200:
                logging.error(f"[Events] Perplexity API error: {response.status_code}")
                return DiscoverEventsResponse(events=[], travel_advisory="Failed to fetch event data")

            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            logging.info(f"[Events] Raw Perplexity response: {content[:500]}...")

            # Parse JSON from response
            # Handle markdown code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            content = content.strip()

            events_data = json.loads(content)

            valid_types = {"festival", "concert", "holiday", "market", "sports", "cultural", "other"}

            events = []
            for event in events_data.get("events", []):
                if isinstance(event, dict) and "name" in event:
                    event_type = event.get("event_type", "other").lower()
                    if event_type not in valid_types:
                        event_type = "other"

                    rating = event.get("backpacker_rating", 3)
                    if not isinstance(rating, int) or rating < 1 or rating > 5:
                        rating = 3

                    # Handle is_free - could be None, missing, or various truthy values
                    is_free_raw = event.get("is_free")
                    is_free = bool(is_free_raw) if is_free_raw is not None else False

                    # Handle estimated_price_usd - convert to float, default to None
                    price_raw = event.get("estimated_price_usd")
                    estimated_price = None
                    if price_raw is not None:
                        try:
                            estimated_price = float(price_raw)
                            # If free event, price should be 0
                            if is_free:
                                estimated_price = 0.0
                        except (ValueError, TypeError):
                            estimated_price = None

                    events.append(EventItem(
                        name=event["name"],
                        event_type=event_type,
                        date_range=event.get("date_range", "Unknown"),
                        location=event.get("location", request.destination),
                        description=event.get("description", ""),
                        is_free=is_free,
                        estimated_price_usd=estimated_price,
                        budget_tip=event.get("budget_tip") or "",
                        backpacker_rating=rating
                    ))

            travel_advisory = events_data.get("travel_advisory", "")

            logging.info(f"[Events] Found {len(events)} events for {request.destination}")
            return DiscoverEventsResponse(events=events, travel_advisory=travel_advisory)

    except json.JSONDecodeError as e:
        logging.error(f"[Events] Failed to parse response: {e}")
        return DiscoverEventsResponse(events=[], travel_advisory="Failed to parse event data")
    except Exception as e:
        logging.error(f"[Events] Discovery failed: {e}")
        return DiscoverEventsResponse(events=[], travel_advisory=f"Error: {str(e)}")


# ============================================
# CONVERSATION VARIABLE EXTRACTION
# ============================================

class ConversationVariables(BaseModel):
    places_discussed: list[str] = []
    places_to_avoid: list[str] = []
    activity_preferences: list[str] = []
    food_preferences: list[str] = []
    accommodation_notes: list[str] = []
    travel_companions: str = ""
    pace_preference: str = ""
    must_do_activities: list[str] = []
    concerns: list[str] = []
    budget_notes: list[str] = []
    custom_notes: dict[str, str] = {}


class ExtractConversationVarsRequest(BaseModel):
    user_message: str
    ai_response: str
    destination: str


class ExtractConversationVarsResponse(BaseModel):
    variables: ConversationVariables
    has_new_info: bool = False


CONVERSATION_VARS_PROMPT = """Analyze this travel conversation exchange and extract key variables that should be remembered for personalizing future responses.

DESTINATION: {destination}

USER MESSAGE:
{user_message}

AI RESPONSE:
{ai_response}

Extract any NEW information revealed in this exchange into these categories:

1. places_discussed: Specific locations mentioned (cities, neighborhoods, hostels, restaurants, landmarks, beaches, hiking trails)
2. places_to_avoid: Places the user explicitly says they don't want to visit or aren't interested in
3. activity_preferences: Activities the user shows interest in (hiking, surfing, nightlife, temples, diving, etc.)
4. food_preferences: Food preferences mentioned (vegetarian, street food, local cuisine, allergies, etc.)
5. accommodation_notes: Preferences about where to stay (social hostels, quiet places, private rooms, specific amenities needed)
6. travel_companions: Who they're traveling with (solo, partner, group of friends, family)
7. pace_preference: Preferred travel pace (fast, slow, flexible)
8. must_do_activities: Things the user explicitly says they MUST do or really want to experience
9. concerns: Worries or constraints (budget, safety, altitude sickness, physical limitations)
10. budget_notes: Specific budget info (can splurge on X, very tight budget, price ranges mentioned)
11. custom_notes: Any other important personal details worth remembering (reason for trip, special occasion, time constraints)

RULES:
1. Only extract NEW information from THIS exchange - don't repeat obvious info
2. Be specific - "hiking in Cotopaxi" is better than just "hiking"
3. For custom_notes, use descriptive keys like "reason_for_trip", "special_occasion", "medical_condition"
4. If nothing new is learned, return empty lists/strings
5. Don't include generic travel advice - only user-specific preferences and facts

Return ONLY valid JSON:
{{
  "places_discussed": ["specific place 1", "specific place 2"],
  "places_to_avoid": [],
  "activity_preferences": ["activity 1"],
  "food_preferences": [],
  "accommodation_notes": [],
  "travel_companions": "",
  "pace_preference": "",
  "must_do_activities": [],
  "concerns": [],
  "budget_notes": [],
  "custom_notes": {{}}
}}
"""


@app.post("/api/extract-conversation-vars", response_model=ExtractConversationVarsResponse)
async def extract_conversation_vars(request: ExtractConversationVarsRequest):
    """Extract conversation variables from a user/AI exchange."""
    try:
        extraction_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

        prompt = CONVERSATION_VARS_PROMPT.format(
            destination=request.destination,
            user_message=request.user_message,
            ai_response=request.ai_response
        )

        result = extraction_llm.invoke(prompt)

        content = result.content.strip()
        # Handle markdown code blocks
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        data = json.loads(content)

        variables = ConversationVariables(
            places_discussed=data.get("places_discussed", []),
            places_to_avoid=data.get("places_to_avoid", []),
            activity_preferences=data.get("activity_preferences", []),
            food_preferences=data.get("food_preferences", []),
            accommodation_notes=data.get("accommodation_notes", []),
            travel_companions=data.get("travel_companions", ""),
            pace_preference=data.get("pace_preference", ""),
            must_do_activities=data.get("must_do_activities", []),
            concerns=data.get("concerns", []),
            budget_notes=data.get("budget_notes", []),
            custom_notes=data.get("custom_notes", {})
        )

        # Check if any meaningful info was extracted
        has_new_info = (
            len(variables.places_discussed) > 0 or
            len(variables.places_to_avoid) > 0 or
            len(variables.activity_preferences) > 0 or
            len(variables.food_preferences) > 0 or
            len(variables.accommodation_notes) > 0 or
            bool(variables.travel_companions) or
            bool(variables.pace_preference) or
            len(variables.must_do_activities) > 0 or
            len(variables.concerns) > 0 or
            len(variables.budget_notes) > 0 or
            len(variables.custom_notes) > 0
        )

        logging.info(f"[ConvVars] Extracted variables, has_new_info={has_new_info}")
        return ExtractConversationVarsResponse(variables=variables, has_new_info=has_new_info)

    except json.JSONDecodeError as e:
        logging.error(f"[ConvVars] Failed to parse response: {e}")
        return ExtractConversationVarsResponse(variables=ConversationVariables(), has_new_info=False)
    except Exception as e:
        logging.error(f"[ConvVars] Extraction failed: {e}")
        return ExtractConversationVarsResponse(variables=ConversationVariables(), has_new_info=False)
