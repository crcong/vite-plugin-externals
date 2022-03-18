<template>
  <button>test externals</button>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
console.log(reactive({}))
console.log(ref)
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
