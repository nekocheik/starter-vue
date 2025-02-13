import axios from 'axios';

export async function executeCommand(command: string): Promise<string> {
  try {
    const response = await axios.post('http://localhost:3000/execute', {
      command
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error);
    }
    
    return response.data.output;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    throw new Error(`Erreur d'exécution: ${errorMessage}`);
  }
}
