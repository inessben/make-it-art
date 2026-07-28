<template>
  <div class="grid gap-3">
    <p :id="instructionsId" class="text-sm text-slate-300">
      Sign with a mouse or finger. With a keyboard, press Space to start or stop drawing, then use
      the arrow keys to move the pen.
    </p>
    <div class="rounded-[20px] border border-slate-800 bg-slate-950 p-4">
      <canvas
        ref="canvasRef"
        class="signature-canvas h-44 w-full touch-none rounded-2xl bg-slate-50"
        role="img"
        tabindex="0"
        aria-label="Signature drawing area"
        :aria-describedby="instructionsId"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointerleave="handlePointerUp"
        @pointercancel="handlePointerUp"
        @keydown="handleKeyDown"
      />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p class="text-slate-300" aria-live="polite">{{ keyboardStatus }}</p>

      <button
        type="button"
        class="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-850 px-4 font-semibold text-slate-100 transition hover:bg-slate-750"
        @click="clearSignature"
      >
        Effacer
      </button>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["update:modelValue"]);

const canvasRef = ref(null);
const instructionsId = `signature-instructions-${Math.random().toString(36).slice(2)}`;
const keyboardStatus = ref(
  "Your signature will be embedded in the final PDF. The signature area is blank."
);
let context = null;
let drawing = false;
let resizeObserver = null;
let keyboardDrawing = false;
let keyboardPosition = { x: 24, y: 24 };

function setupCanvas() {
  const canvas = canvasRef.value;

  if (!canvas) {
    return;
  }

  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.scale(ratio, ratio);
  context.lineJoin = "round";
  context.lineCap = "round";
  context.lineWidth = 2.2;
  context.strokeStyle = getCanvasToken("--signature-stroke");
  context.fillStyle = getCanvasToken("--signature-fill");
  context.fillRect(0, 0, width, height);

  if (props.modelValue) {
    restoreSignature(props.modelValue);
  }
}

function getPointerPosition(event) {
  const canvas = canvasRef.value;
  const bounds = canvas.getBoundingClientRect();

  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top
  };
}

function getCanvasToken(name) {
  const canvas = canvasRef.value;

  if (!canvas) {
    return "";
  }

  return getComputedStyle(canvas).getPropertyValue(name).trim();
}

function handlePointerDown(event) {
  if (!context) {
    return;
  }

  drawing = true;
  const { x, y } = getPointerPosition(event);

  context.beginPath();
  context.moveTo(x, y);
}

function handlePointerMove(event) {
  if (!drawing || !context) {
    return;
  }

  const { x, y } = getPointerPosition(event);

  context.lineTo(x, y);
  context.stroke();
}

function handlePointerUp() {
  if (!drawing) {
    return;
  }

  drawing = false;
  emitSignature();
}

function handleKeyDown(event) {
  if (!context || !canvasRef.value) return;
  if (event.key === " ") {
    event.preventDefault();
    keyboardDrawing = !keyboardDrawing;
    context.beginPath();
    context.moveTo(keyboardPosition.x, keyboardPosition.y);
    keyboardStatus.value = keyboardDrawing
      ? "Keyboard drawing started. Use the arrow keys and press Space to stop."
      : "Keyboard drawing stopped. Signature recorded.";
    if (!keyboardDrawing) emitSignature();
    return;
  }
  const movement = {
    ArrowUp: [0, -4],
    ArrowDown: [0, 4],
    ArrowLeft: [-4, 0],
    ArrowRight: [4, 0]
  }[event.key];
  if (!movement) return;
  event.preventDefault();
  const nextX = Math.min(
    Math.max(keyboardPosition.x + movement[0], 0),
    canvasRef.value.clientWidth
  );
  const nextY = Math.min(
    Math.max(keyboardPosition.y + movement[1], 0),
    canvasRef.value.clientHeight
  );
  if (keyboardDrawing) {
    context.lineTo(nextX, nextY);
    context.stroke();
  }
  keyboardPosition = { x: nextX, y: nextY };
}

function emitSignature() {
  const canvas = canvasRef.value;

  if (!canvas) {
    return;
  }

  emit("update:modelValue", canvas.toDataURL("image/png"));
  keyboardStatus.value = "Signature recorded. Use Clear to start again.";
}

function clearSignature() {
  const canvas = canvasRef.value;

  if (!canvas || !context) {
    emit("update:modelValue", "");
    return;
  }

  context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  context.fillStyle = getCanvasToken("--signature-fill");
  context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  emit("update:modelValue", "");
  keyboardDrawing = false;
  keyboardPosition = { x: 24, y: 24 };
  keyboardStatus.value = "Signature cleared. The signature area is blank.";
}

function restoreSignature(dataUrl) {
  const image = new Image();

  image.onload = () => {
    if (!context || !canvasRef.value) {
      return;
    }

    context.drawImage(image, 0, 0, canvasRef.value.clientWidth, canvasRef.value.clientHeight);
  };
  image.src = dataUrl;
}

onMounted(() => {
  setupCanvas();

  resizeObserver = new ResizeObserver(() => {
    const currentValue = props.modelValue;
    setupCanvas();
    if (currentValue) {
      restoreSignature(currentValue);
    }
  });

  if (canvasRef.value) {
    resizeObserver.observe(canvasRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.signature-canvas {
  --signature-stroke: theme("colors.slate.800");
  --signature-fill: theme("colors.slate.50");
}
</style>
