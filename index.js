const request = require('request-promise');
const express = require('express');
const graphqlHTTP = require('express-graphql');
const { makeExecutableSchema } = require('graphql-tools');

const typeDefs = `
  directive @isAuthenticated on FIELD | FIELD_DEFINITION
  directive @hasRole(role: String) on FIELD | FIELD_DEFINITION
  
  # Mostra os dados do cliente atravez do token
  type Client {
    # Identificação do cliente
    id: Int
    # Nome oficial
    official_name: String
    # Nome comum
    common_name: String
    # Email principal do cliente
    email: String @hasRole(role: "MANAGER")
    # Informe se é o cliente de ambiente teste
    sandbox_client: Boolean
  }

  type Query {
    client(token: String!): Client @isAuthenticated
  }
`;

const resolvers = {
  Query: {
    client: (root, { token }, context) => {
      return request({
        url: 'https://api-testing.intelipost.com.br/api/v1/client',
        headers: {
          token,
        },
        json: true
      }).then(res => res.content);
    }
  },
};

const directiveResolvers = {
  hasRole: (next, source, {role}, ctx) => {
    const user = {
      role: 'MANAGER'
    };
    if (role === user.role) return next();
    throw new Error(`Must have role: ${role}, you have role: ${user.role}`)
  },

  isAuthenticated: (next) => {
    const user = {
      authenticated: true
    };

    if (user.authenticated) return next()
    throw new Error(`Must be logged in to view this field`)
  }
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  directiveResolvers
});

const app = express();

app.use('/graphql', graphqlHTTP({
  schema: schema,
  graphiql: true,
}));

app.listen(4000, () => console.log('Now browse to http://localhost:4000/graphql'));