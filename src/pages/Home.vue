<script setup lang="ts">
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { ref, watch, nextTick } from 'vue'
import axios from 'axios'
import { useGit } from '@/composables/useGit'
import { useChatAi } from '@/composables/useChatAi'
import { useToast } from '@/components/ui/toast/use-toast'
import { Textarea } from "@/components/ui/textarea"
import MessageFormatter from '@/components/MessageFormatter.vue'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Interfaces
interface Message {
  content: string;
  role: 'system' | 'user' | 'assistant';
  type?: 'command' | 'message' | 'command-output';
  executedCommand?: {
    command: string;
    output: string;
  };
}

// État du chat
const chatInput = ref('')
const chatContext = ref<'normal' | 'commit'>('normal')
const commitMessage = ref('')
const editCommandInput = ref<HTMLInputElement | null>(null);

const {
  messages,
  isLoading,
  isCommandLoading,
  sendMessage: sendChatMessage,
  clearMessages,
  currentMode,
  changeMode,
  chatModes,
  editingCommandId,
  editingCommand,
  startEditing,
  confirmReExecuteCommand,
  cancelEditing,
  command,
  output,
  executeTerminalCommand,
} = useChatAi();

// Fonction pour gérer la modification des commits
const handleModifyCommit = (message: string) => {
  commitMessage.value = message;
  chatContext.value = 'commit';
};

const { state: gitState, createBranch, autoCommit } = useGit(handleModifyCommit)
const { toast } = useToast()

// Fonction pour exécuter des commandes
async function executeCommand() {
  if (!command.value) return

  isLoading.value = true
  try {
    // Ajouter la commande aux messages du chat
    messages.value.push({
      content: command.value,
      role: 'assistant',
      type: 'command'
    });

    const response = await axios.post('http://localhost:3000/execute', {
      command: command.value
    })

    // Ajouter la sortie aux messages du chat
    messages.value.push({
      content: response.data.output,
      role: 'assistant',
      type: 'command-output'
    });

    output.value = response.data.output
    command.value = ''
    toast({
      title: "Succès",
      description: "Commande exécutée avec succès",
    })
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    output.value = `Error: ${errorMessage}`
    
    // Ajouter l'erreur aux messages du chat
    messages.value.push({
      content: `Error: ${errorMessage}`,
      role: 'assistant',
      type: 'command-output'
    });

    toast({
      title: "Erreur",
      description: errorMessage,
      variant: "destructive"
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// Fonction pour envoyer un message dans le chat
async function handleSendMessage() {
  if (!chatInput.value.trim()) return
  await sendChatMessage(chatInput.value)
  chatInput.value = ''
  scrollToBottom()
}

// Référence pour la div des messages
const messagesContainer = ref<HTMLElement | null>(null)

// Fonction pour scroller en bas
const scrollToBottom = () => {
  nextTick(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  })
}

// Observer les changements dans les messages
watch(
  () => messages.value,
  () => {
    scrollToBottom()
  },
  { deep: true, immediate: true }
)

// Fonction pour réexécuter une commande
const reExecuteCommand = async (cmd: string) => {
  // Ajouter un message indiquant la réexécution
  messages.value.push({
    content: `Réexécution de la commande :`,
    role: 'assistant',
    type: 'command'
  });

  // Ajouter la commande qui va être réexécutée
  messages.value.push({
    content: cmd,
    role: 'assistant',
    type: 'command'
  });

  // Exécuter la commande
  command.value = cmd;
  await executeCommand();
};

// Fonction pour gérer le focus après l'édition
const handleStartEditing = (index: number, commandText: string) => {
  startEditing(index, commandText);
  nextTick(() => {
    editCommandInput.value?.focus();
  });
};
</script>

<template>
  <main class="container mx-auto p-4 relative">
    <div class="h-[40px] pl-4 pt-4">
      <div class="flex gap-4 mb-4 fixed top-4 left-4 right-0">
        <Button @click="createBranch" :disabled="gitState.isLoading" variant="outline">
          {{ gitState.isLoading ? 'Création...' : 'Nouvelle Branche' }}
        </Button>
        <Button @click="autoCommit" :disabled="gitState.isLoading" variant="outline">
          {{ gitState.isLoading ? 'Commit en cours...' : 'Auto Commit' }}
        </Button>
      </div>
    </div>


    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-24">
      <!-- Section Commandes -->
      <div>
        <Card class="h-[70vh] left-4 mt-4 fixed w-[48%]">
          <CardHeader>
            <h3 class="text-lg font-semibold">Command Execution</h3>
          </CardHeader>
          <CardContent class="">
            <div class="flex flex-col gap-4">
              <div class="flex gap-2">
                <Input v-model="command" placeholder="Enter command (e.g. ls -la)" @keyup.enter="executeTerminalCommand"
                  class="flex-1" />
                <Button @click="executeTerminalCommand" :disabled="isLoading" variant="default">
                  {{ isLoading ? 'Executing...' : 'Execute' }}
                </Button>
              </div>

              <div v-if="output" class="bg-muted p-4 rounded-md h-[50vh] overflow-y-auto">
                <pre class="whitespace-pre-wrap">{{ output }}</pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      <!-- Section Chat -->
      <Card class="relative h-full mt-4">
        <CardHeader class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-semibold">
              {{ chatModes[currentMode].icon }} {{ chatModes[currentMode].name }}
            </h3>
            <div class="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Changer de Mode
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem v-for="(mode, key) in chatModes" :key="key" @click="changeMode(key)">
                    {{ mode.icon }} {{ mode.name }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" @click="clearMessages">
                Clear Chat
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-4">
            <!-- Messages -->
            <div ref="messagesContainer" class="space-y-4 overflow-y-auto p-4 mb-20">
              <div v-for="(message, index) in messages" :key="index" :class="[
                'p-3 rounded-lg text-sm',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]'
                  : message.type === 'command' 
                    ? 'bg-black text-white font-mono cursor-pointer hover:bg-zinc-900'
                    : message.type === 'command-output'
                      ? 'bg-zinc-900 text-white font-mono'
                      : 'bg-muted max-w-[80%]',
                message.type === 'command' || message.type === 'command-output' ? 'w-full' : ''
              ]">
                <!-- Message normal -->
                <div v-if="!message.type || message.type === 'message'">
                  <MessageFormatter :content="message.content" />
                </div>

                <!-- Commande -->
                <div v-else-if="message.type === 'command'" 
                     class="space-y-2 flex justify-between items-center">
                  <div class="flex items-center gap-2 flex-1">
                    <span class="text-xs opacity-70">$</span>
                    <Input 
                      v-if="editingCommandId === index"
                      v-model="editingCommand"
                      class="font-mono bg-zinc-900 text-white border-none"
                      @keyup.enter="confirmReExecuteCommand"
                      @keyup.esc="cancelEditing"
                      ref="editCommandInput"
                    />
                    <span v-else 
                          @click="handleStartEditing(index, message.content)" 
                          class="cursor-pointer hover:opacity-80">
                      {{ message.content }}
                      <span v-if="isCommandLoading" class="ml-2 inline-block animate-spin">⚡</span>
                    </span>
                  </div>
                  <div class="flex gap-2">
                    <Button 
                      v-if="editingCommandId === index"
                      variant="ghost" 
                      size="sm" 
                      class="text-xs opacity-70 hover:opacity-100"
                      @click="confirmReExecuteCommand">
                      Exécuter
                    </Button>
                    <Button 
                      v-else
                      variant="ghost" 
                      size="sm" 
                      class="text-xs opacity-70 hover:opacity-100"
                      @click.stop="handleStartEditing(index, message.content)">
                      Réexécuter
                    </Button>
                  </div>
                </div>

                <!-- Sortie de commande -->
                <div v-else-if="message.type === 'command-output'" class="space-y-2">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs opacity-70">Command Execution</span>
                  </div>
                  <div class="whitespace-pre-wrap opacity-90">{{ message.content }}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Input fixé en bas au centre -->
    <div class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
      <div class="mx-auto max-w-2xl max-w-[calc(100%-100px)]">
        <div class="flex flex-col gap-2">
          <div class="flex justify-start gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Changer de Mode
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem v-for="(mode, key) in chatModes" :key="key" @click="changeMode(key)">
                  {{ mode.icon }} {{ mode.name }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" @click="clearMessages">
              Clear Chat
            </Button>
          </div>
          <div class="flex flex-row gap-2 items-start">
            <Textarea v-model="chatInput" placeholder="Type your message..." @keyup.enter="handleSendMessage"
              :disabled="isLoading" class="min-h-[80px] resize-none" />
            <Button @click="handleSendMessage" :disabled="isLoading" variant="default" class="self-stretch">
              {{ isLoading ? 'Sending...' : 'Send' }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </main>
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