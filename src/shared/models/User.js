import Entity from 'udany-toolbox/classes/Entity.js';

/**
 * @name User
 * @property {Number} id
 *
 * @property {String} name
 * @property {String} email
 * @property {?String} googleId
 * @property {?String} twitterId
 */
export class User extends Entity {}

User.Register();
User.Attributes = [
	new Entity.Attributes.Integer('id'),

	new Entity.Attributes.String('name'),
	new Entity.Attributes.String('email'),

	new Entity.Attributes.String('googleId').safe(false),
	new Entity.Attributes.String('twitterId').safe(false),
];
