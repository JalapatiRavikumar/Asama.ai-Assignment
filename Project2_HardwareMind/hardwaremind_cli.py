import os
import sys
import subprocess
import google.generativeai as genai
from rich.console import Console
from rich.markdown import Markdown

console = Console()

def get_ram_info() -> str:
    try:
        return subprocess.check_output(['free', '-h'], timeout=2).decode('utf-8')
    except Exception as e:
        return f"Error reading RAM: {e}"

def get_cpu_info() -> str:
    try:
        return subprocess.check_output(['lscpu'], timeout=2).decode('utf-8')
    except Exception as e:
        return f"Error reading CPU info: {e}"

tools_mapping = {"get_ram_info": get_ram_info, "get_cpu_info": get_cpu_info}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyD2VxZcYMBXLdHW_EF7dbW7L9WUqf-J89Y")
if not GEMINI_API_KEY:
    console.print("[bold red]Error: GEMINI_API_KEY not set.[/bold red]")
    sys.exit(1)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel(
    model_name='gemini-1.5-pro',
    tools=list(tools_mapping.values()),
    system_instruction="You are HardwareMind, a secure Linux hardware assistant."
)

chat = model.start_chat(enable_automatic_function_calling=True)

def main_loop():
    console.print("[bold blue]Welcome to HardwareMind![/bold blue] Type 'exit' to quit.")
    while True:
        try:
            user_input = console.input("[bold green]You:[/bold green] ")
            if user_input.lower() in ['exit', 'quit']: break
            console.print("[dim]Thinking...[/dim]")
            response = chat.send_message(user_input)
            console.print(Markdown("**HardwareMind:**\n" + response.text))
            console.print("-" * 40)
        except Exception as e:
            console.print(f"[bold red]An error occurred: {e}[/bold red]")

if __name__ == "__main__":
    main_loop()