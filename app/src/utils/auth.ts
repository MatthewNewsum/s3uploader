// src/utils/auth.ts
import { CognitoUser, CognitoUserPool, AuthenticationDetails, CognitoUserSession } from 'amazon-cognito-identity-js';
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";

const userPoolConfig = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!
};

const userPool = new CognitoUserPool(userPoolConfig);

export const signUp = (email: string, password: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    userPool.signUp(
      email,
      password,
      [],
      [],
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      }
    );
  });
};

export const signIn = (email: string, password: string): Promise<any> => {
  const authenticationDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session: CognitoUserSession) => {
        resolve(session);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
};

export const getCurrentUser = (): Promise<CognitoUser | null> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) {
          resolve(null);
          return;
        }
        resolve(cognitoUser);
      });
    } else {
      resolve(null);
    }
  });
};

export const signOut = () => {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
};

export const getAwsCredentials = async (session: CognitoUserSession) => {
  const cognitoIdentityClient = new CognitoIdentityClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION
  });

  const credentials = fromCognitoIdentityPool({
    client: cognitoIdentityClient,
    identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID!,
    logins: {
      [`cognito-idp.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}`]: session.getIdToken().getJwtToken(),
    },
  });

  return credentials;
};
