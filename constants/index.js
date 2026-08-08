const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
  OWNER: 'owner',
  OPERATOR: 'operator',
});

const ROLES_HIERARCHY = Object.freeze([ROLES.OPERATOR, ROLES.USER, ROLES.ADMIN, ROLES.OWNER]);

module.exports = { ROLES, ROLES_HIERARCHY };
