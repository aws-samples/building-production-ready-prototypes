import * as cdk from 'aws-cdk-lib';
import * as ReviewsApi from '../lib/reviews-api-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new ReviewsApi.ReviewsApiStack(app, 'MyTestStack');
    // THEN
    const actual = app.synth().getStackArtifact(stack.artifactId).template;
    expect(actual.Resources ?? {}).toEqual({});
});
