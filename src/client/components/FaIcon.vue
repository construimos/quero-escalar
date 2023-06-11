<template>
	<font-awesome-icon class="fa-icon" :icon="iconArray" v-if="iconArray" />
</template>

<script>
	export default {
		name: 'FaIcon',
		props: {
			brand: {
				type: Boolean,
				default: false
			}
		},
		computed: {
			iconArray() {
				const arr = [];
				if (this.brand) {
					arr.push('fab');
				} else {
					arr.push('fa');
				}
				let children = this.$slots.default()[0].children;
				while (children instanceof Array) {
					children = children[0].children;
				}
				if (children.trim) {
					arr.push(children.trim());
				} else {
					console.error(`Non string icon`, children);
					return null;
				}
				return arr;
			}
		}
	}
</script>

<style lang="scss" scoped></style>