from pathlib import Path

fixes = {
    "src/RoomPage.js": [
        ("\n)\n);\n}\n\nexport default RoomPage;", "\n);\n}\n\nexport default RoomPage;")
    ],
    "src/ConfigPage.js": [
        ("\n)\n);\n\n}\n\nexport default ConfigPage;", "\n);\n\n}\n\nexport default ConfigPage;")
    ],
    "src/GamePage.js": [
        ("\n)\n  );\n}\nexport default GamePage;", "\n  );\n}\nexport default GamePage;")
    ],
}

for path, replacements in fixes.items():
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    for old, new in replacements:
        text = text.replace(old, new)
    file.write_text(text, encoding="utf-8")

print("JSX closings normalized")
