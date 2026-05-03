import { ref } from 'vue';

const message = ref('');
const type    = ref('success');
let timer;

export function useToast() {
  const show = (msg, t = 'success', duration = 3000) => {
    clearTimeout(timer);
    message.value = msg;
    type.value    = t;
    timer = setTimeout(() => { message.value = ''; }, duration);
  };

  const success = (msg) => show(msg, 'success');
  const error   = (msg) => show(msg, 'error');

  return { message, type, success, error };
}
