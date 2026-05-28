const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
  OWNER: 'owner',
});

const ROLES_HIERARCHY = Object.freeze([ROLES.USER, ROLES.ADMIN, ROLES.OWNER]);

module.exports = { ROLES, ROLES_HIERARCHY };
