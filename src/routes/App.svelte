<script lang="ts">
import { MathUtils } from 'three'
  import { Canvas } from '@threlte/core'
  import {T} from '@threlte/core'
  import Character from './Character.svelte'
  	type CharacterActions =
		'agree' | 'headShake' | 'idle' | 'run' | 'sad_pose' | 'sneak_pose' | 'walk';
    let action = $state<CharacterActions>('idle')
</script>
<button
    
    onclick={() => {
      action = 'idle'
    }}
  > Idle</button>
  <button
    
    onclick={() => {
      action = 'walk'
    }}
  > Walk</button>
  <button
    
    onclick={() => {
      action = 'run'
    }}
  > Run</button>

  
<Canvas>
  
<T.PerspectiveCamera
  makeDefault
  position={[-0.85, 1.75, 2.46]}
  oncreate={(ref: { lookAt: (arg0: number, arg1: number, arg2: number) => void; }) => {
    ref.lookAt(0, 1, 0)
  }}
/>


<T.AmbientLight />
<T.DirectionalLight
  position={[10, 5, 5]}
  castShadow
/>

<Character actionKey={action} />

<T.Mesh
  rotation.x={MathUtils.degToRad(-90)}
  receiveShadow
>
  <T.CircleGeometry args={[3, 72]} />
  <T.MeshStandardMaterial color="white" />
</T.Mesh>
</Canvas>