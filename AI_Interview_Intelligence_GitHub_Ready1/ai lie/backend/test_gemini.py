import os

from dotenv import load_dotenv
from google import genai


# =========================================================
# LOAD ENVIRONMENT
# =========================================================

load_dotenv()


# =========================================================
# API KEY
# =========================================================

api_key = os.getenv("GEMINI_API_KEY")


if not api_key:

    print("ERROR: GEMINI_API_KEY is missing.")
    print("Check your backend/.env file.")

    exit()


print("API key found.")
print("Key starts with:", api_key[:8] + "...")


# =========================================================
# CREATE CLIENT
# =========================================================

try:

    client = genai.Client(
        api_key=api_key
    )

    print("Gemini client created successfully.")

except Exception as error:

    print("ERROR creating Gemini client:")
    print(error)

    exit()


# =========================================================
# LIST MODELS
# =========================================================

print("\nChecking available models...\n")


try:

    models = client.models.list()

    model_names = []

    for model in models:

        name = model.name

        model_names.append(name)

        print(name)


    if not model_names:

        print("\nNo models were returned.")

        exit()


except Exception as error:

    print("\nMODEL LIST REQUEST FAILED")

    print(error)

    exit()


# =========================================================
# FIND A GENERATION MODEL
# =========================================================

selected_model = None


for name in model_names:

    name_lower = name.lower()

    if (
        "flash" in name_lower
        and "embedding" not in name_lower
    ):

        selected_model = name

        break


if selected_model is None:

    print("\nNo Flash model found.")

    print("Use one of the models printed above.")

    exit()


print("\nSelected model:")
print(selected_model)


# =========================================================
# TEST GENERATION
# =========================================================

print("\nTesting Gemini generation...\n")


try:

    response = client.models.generate_content(

        model=selected_model,

        contents=(
            "You are an interviewer. "
            "Ask one short Software Developer "
            "interview question. "
            "Return only the question."
        )

    )


    print("SUCCESS!")
    print("\nGemini response:")
    print(response.text)


except Exception as error:

    print("\nGENERATION REQUEST FAILED")

    print(error)