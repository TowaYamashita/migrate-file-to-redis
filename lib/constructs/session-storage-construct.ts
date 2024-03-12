import { Construct } from "constructs";
import { Peer, Port, SecurityGroup, SelectedSubnets, Vpc } from 'aws-cdk-lib/aws-ec2';
import { CfnParameterGroup, CfnReplicationGroup, CfnSubnetGroup, CfnUser, CfnUserGroup } from 'aws-cdk-lib/aws-elasticache';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

interface SessionStorageProps {
  vpc: Vpc;
  selectSubnets: SelectedSubnets;
}

export class SessionStorageConstruct extends Construct {
  readonly secretName : string;
  readonly redisClusterSecurityGroupId: string;
  readonly endpoint: string;
  readonly readPasswordPolicy : PolicyStatement;
  
  constructor(scope: Construct, id: string, props : SessionStorageProps) {
    super(scope, id);

    const userName = "default";
    const redisPassword = new Secret(this, "Secret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: userName }),
        generateStringKey: "password",
        excludeCharacters: "@%*()_+=`~{}|[]\\:\";'?,./",
      },
    });
    this.secretName = redisPassword.secretName;

    const userId = "user-1";
    const redisUser = new CfnUser(this, "RedisUser", {
      userId: userId,
      userName: userName,
      engine: "redis",
      accessString: "on ~* +@all",
      passwords: [redisPassword.secretValueFromJson("password").unsafeUnwrap()],
    });
    const redisUserGroup = new CfnUserGroup(this, "RedisUserGroup", {
      userGroupId: "user-group",
      engine: "redis",
      userIds: [redisUser.userId],
    });
    redisUserGroup.node.addDependency(redisUser);
    const redisSG = new SecurityGroup(this, 'RedisSG', {
      vpc: props.vpc,
      allowAllOutbound: false,
    });
    this.redisClusterSecurityGroupId = redisSG.securityGroupId;
    const cluster = new CfnReplicationGroup(this, "RedisReplicationGroup", {
      replicationGroupDescription: "my-replication-group",
      engine: "redis",
      engineVersion: "7.0",
      cacheNodeType: "cache.t3.micro",
      cacheSubnetGroupName: new CfnSubnetGroup(this, "SubnetGroup", {
        description: "my-subnet-group",
        subnetIds: props.selectSubnets.subnetIds,
      }).ref,
      cacheParameterGroupName: new CfnParameterGroup(this, "ParameterGroup", {
        description: "my-parameter-group",
        cacheParameterGroupFamily: "redis7",
      }).ref,
      numNodeGroups: 1,
      replicasPerNodeGroup: 1,
      securityGroupIds: [redisSG.securityGroupId],
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      userGroupIds: [redisUserGroup.userGroupId],
    });
    cluster.node.addDependency(redisUserGroup);

    this.endpoint = cluster.attrPrimaryEndPointAddress;
    
    this.readPasswordPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "secretsmanager:GetResourcePolicy",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds",
      ],
      resources: [redisPassword.secretArn],
    });
  }
}