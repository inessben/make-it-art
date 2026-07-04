<template>
  <div class="grid gap-3">
    <div class="rounded-[20px] border border-[#1A1F2A] bg-[#050916] p-4">
      <canvas
        ref="canvasRef"
        class="h-44 w-full touch-none rounded-2xl bg-[#F8FAFC]"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointerleave="handlePointerUp"
        @pointercancel="handlePointerUp"
      />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p class="text-[#A0ADB4]">
        Signez a la souris ou au doigt. La signature sera integree au PDF final.
      </p>

      <button
        type="button"
        class="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#1A1F2A] bg-[#10151E] px-4 font-semibold text-[#E6EDF7] transition hover:bg-[#1F273A]"
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
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);

const canvasRef = ref(null);
let context = null;
let drawing = false;
let resizeObserver = null;

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
  context.strokeStyle = "#111827";
  context.fillStyle = "#F8FAFC";
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
    y: event.clientY - bounds.top,
  };
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

function emitSignature() {
  const canvas = canvasRef.value;

  if (!canvas) {
    return;
  }

  emit("update:modelValue", canvas.toDataURL("image/png"));
}

function clearSignature() {
  const canvas = canvasRef.value;

  if (!canvas || !context) {
    emit("update:modelValue", "");
    return;
  }

  context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  context.fillStyle = "#F8FAFC";
  context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  emit("update:modelValue", "");
}

function restoreSignature(dataUrl) {
  const image = new Image();

  image.onload = () => {
    if (!context || !canvasRef.value) {
      return;
    }

    context.drawImage(
      image,
      0,
      0,
      canvasRef.value.clientWidth,
      canvasRef.value.clientHeight,
    );
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
