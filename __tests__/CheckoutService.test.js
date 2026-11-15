import { CheckoutService } from '../src/services/CheckoutService.js';
import { Item } from '../src/domain/Item.js';
import { Pedido } from '../src/domain/Pedido.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';

const creditCard = { number: '4111111111111111', holder: 'TEST USER', cvv: '123' };

describe('CheckoutService', () => {
    describe('processarPedido', () => {
        describe('when the payment fails', () => {
            it('should return null', async () => {
                // Arrange
                const carrinho = new CarrinhoBuilder().build();
                const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: false }) };
                const repositoryDummy = {};
                const emailDummy = {};
                const checkoutService = new CheckoutService(gatewayStub, repositoryDummy, emailDummy);

                // Act
                const pedido = await checkoutService.processarPedido(carrinho, creditCard);

                // Assert
                expect(pedido).toBeNull();
            });

            it('should not save the order nor send an email', async () => {
                // Arrange
                const carrinho = new CarrinhoBuilder().build();
                const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: false }) };
                const repositoryMock = { salvar: jest.fn() };
                const emailMock = { enviarEmail: jest.fn() };
                const checkoutService = new CheckoutService(gatewayStub, repositoryMock, emailMock);

                // Act
                await checkoutService.processarPedido(carrinho, creditCard);

                // Assert
                expect(repositoryMock.salvar).not.toHaveBeenCalled();
                expect(emailMock.enviarEmail).not.toHaveBeenCalled();
            });
        });

        describe('when a standard customer completes the purchase', () => {
            let carrinho;
            let gatewayStub;
            let repositoryStub;

            beforeEach(() => {
                carrinho = new CarrinhoBuilder()
                    .comUser(UserMother.umUsuarioPadrao())
                    .comItens([new Item('Keyboard', 60), new Item('Mouse', 40)])
                    .build();
                gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
                repositoryStub = {
                    salvar: jest.fn(async (p) => new Pedido(1, p.carrinho, p.totalFinal, p.status)),
                };
            });

            it('should return the saved order with the full total and PROCESSADO status', async () => {
                // Arrange
                const emailStub = { enviarEmail: jest.fn().mockResolvedValue() };
                const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailStub);

                // Act
                const pedido = await checkoutService.processarPedido(carrinho, creditCard);

                // Assert
                expect(pedido.totalFinal).toBe(100);
                expect(pedido.status).toBe('PROCESSADO');
            });

            it('should still return the saved order when the email fails', async () => {
                // Arrange
                const emailStub = { enviarEmail: jest.fn().mockRejectedValue(new Error('smtp failure')) };
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
                const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailStub);

                // Act
                const pedido = await checkoutService.processarPedido(carrinho, creditCard);

                // Assert
                expect(pedido.id).toBe(1);
                expect(pedido.status).toBe('PROCESSADO');

                consoleSpy.mockRestore();
            });
        });

        describe('when a Premium customer completes the purchase', () => {
            it('should charge with a 10% discount and send the confirmation email', async () => {
                // Arrange
                const premiumUser = UserMother.umUsuarioPremium();
                const carrinho = new CarrinhoBuilder()
                    .comUser(premiumUser)
                    .comItens([new Item('Monitor', 120), new Item('Headset', 80)])
                    .build();
                const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
                const repositoryStub = {
                    salvar: jest.fn(async (p) => new Pedido(1, p.carrinho, p.totalFinal, p.status)),
                };
                const emailMock = { enviarEmail: jest.fn().mockResolvedValue() };
                const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailMock);

                // Act
                await checkoutService.processarPedido(carrinho, creditCard);

                // Assert
                expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, creditCard);
                expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
                expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                    'premium@email.com',
                    'Seu Pedido foi Aprovado!',
                    'Pedido 1 no valor de R$180'
                );
            });
        });
    });
});
