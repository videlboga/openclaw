import re

with open("ui/src/lain/main.ts", "r") as f:
    text = f.read()

text = re.sub(
    r"""import \{
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
\} from "\.\.\/ui\/chat\/grouped-render\.ts";\n""",
    "",
    text,
    count=1
)

with open("ui/src/lain/main.ts", "w") as f:
    f.write(text)

