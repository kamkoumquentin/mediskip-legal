@python -c "from google import genai; import sys; client = genai.Client(); print(client.models.generate_content(model='gemini-2.5-flash', contents=sys.argv[1]).text)" %1 
