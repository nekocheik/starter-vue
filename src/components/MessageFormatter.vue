<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  content: string;
}>();

const formattedContent = computed(() => {
  const parts = props.content.split(/(terminalCommand\{\{.*?\}\})/g);
  
  return parts.map(part => {
    if (part.startsWith('terminalCommand{{')) {
      return {
        type: 'loading',
        content: ''
      };
    }
    
    return {
      type: 'text',
      content: part
        .split('\n')
        .map(line => {
          if (line.startsWith('```')) {
            return line.includes('```\n')
              ? '<div class="bg-muted p-2 rounded mt-2 mb-2 font-mono">'
              : '</div>';
          }
          return line;
        })
        .join('<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
    };
  });
});
</script>

<template>
  <template v-for="(part, index) in formattedContent" :key="index">
    <div v-if="part.type === 'loading'" class="flex items-center gap-2 my-1">
      <span class="loading-spinner">⚡</span>
      <span class="text-muted-foreground">Préparation de la commande...</span>
    </div>
    <span v-else v-html="part.content"></span>
  </template>
</template>

<style scoped>
.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
