import argparse
import json
from pathlib import Path

from PIL import Image, ImageColor, ImageDraw


def color_rgba(value: str) -> tuple[int, int, int, int]:
    return ImageColor.getcolor(value, "RGBA")


def restore(input_path: Path, output_path: Path) -> dict[str, int | str]:
    data = json.loads(input_path.read_text(encoding="utf-8-sig"))

    canvas = data["canvas"]
    brush = data["brush"]
    width = int(canvas["width"])
    height = int(canvas["height"])
    brush_width = max(1, round(float(brush["width"])))
    brush_color = color_rgba(brush.get("color", "#000000"))
    background_color = color_rgba(canvas.get("backgroundColor", "#ffffff"))

    image = Image.new("RGBA", (width, height), background_color)
    draw = ImageDraw.Draw(image)
    radius = brush_width / 2
    point_count = 0

    for stroke in data.get("strokes", []):
        points = [
            (float(point["x"]), float(point["y"]))
            for point in stroke.get("points", [])
        ]
        point_count += len(points)
        if not points:
            continue

        if len(points) > 1:
            draw.line(
                points,
                fill=brush_color,
                width=brush_width,
                joint="curve",
            )

        # Canvas 2D에서 사용한 둥근 선 끝(lineCap="round")을 재현한다.
        cap_points = points if len(points) == 1 else (points[0], points[-1])
        for x, y in cap_points:
            draw.ellipse(
                (x - radius, y - radius, x + radius, y + radius),
                fill=brush_color,
            )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(output_path, format="PNG")

    return {
        "participantId": data.get("participantId", "unknown"),
        "strokeCount": len(data.get("strokes", [])),
        "pointCount": point_count,
        "width": width,
        "height": height,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="저장된 손글씨 JSON의 획 좌표를 PNG 이미지로 복원합니다."
    )
    parser.add_argument("input", type=Path, help="손글씨 JSON 파일")
    parser.add_argument("output", type=Path, help="복원할 PNG 파일")
    args = parser.parse_args()

    summary = restore(args.input, args.output)
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
